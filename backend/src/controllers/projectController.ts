import { Response } from 'express';
import { 
  Project, TeamMember, User, Requirement, Document as AcademicDocument,
  Meeting, ADRDecision, ADRReview, Notification, Diagram, Task,
  TraceLink, SourceDocument, AuditLog, ProjectInvite, PresenceSession,
  Comment, Deliverable, Approval 
} from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const createProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { name, description, problem, objectives, restrictions, companyName, companyContact, methodology } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      problem: problem || '',
      objectives: objectives || '',
      restrictions: restrictions || '',
      companyName: companyName || '',
      companyContact: companyContact || '',
      methodology: methodology || 'Scrum'
    });

    // Create standard TeamMember entry for creator as Admin
    await TeamMember.create({
      user: req.user._id,
      project: project._id,
      role: 'Admin',
      operationalRole: 'Líder Técnico',
      workload: 100
    });

    // Add to user's assigned projects
    await User.findByIdAndUpdate(req.user._id, {
      $push: { assignedProjects: project._id }
    });

    await logAudit(req, project._id.toString(), 'CREATE_PROJECT', 'Project', project._id.toString(), `Name: ${name}`);

    return res.status(201).json(project);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjects = async (req: ProjectAuthRequest, res: Response) => {
  try {
    let projects;
    if (req.user.role === 'Admin') {
      projects = await Project.find({});
    } else {
      const memberships = await TeamMember.find({ user: req.user._id });
      const projectIds = memberships.map(m => m.project);
      projects = await Project.find({ _id: { $in: projectIds } });
    }
    return res.json(projects);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const role = await getProjectRole(req.user._id, req.params.id);
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.json(project);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const role = await getProjectRole(req.user._id, req.params.id);
    if (role !== 'Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only project Admins can update the project metadata.' });
    }

    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await logAudit(req, project._id.toString(), 'UPDATE_PROJECT', 'Project', project._id.toString(), `Updated metadata for project: ${project.name}`);

    return res.json(project);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const addTeamMember = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { userId, role, operationalRole, workload } = req.body;
    const projectId = req.params.projectId;

    if (!userId || !role) {
      return res.status(400).json({ message: 'User ID and project role are required' });
    }

    const currentRole = await getProjectRole(req.user._id, projectId);
    if (currentRole !== 'Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only project Admins can add members.' });
    }

    // Check if membership already exists
    const existing = await TeamMember.findOne({ user: userId, project: projectId });
    if (existing) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    const member = await TeamMember.create({
      user: userId,
      project: projectId,
      role,
      operationalRole: operationalRole || 'Full Stack Developer',
      workload: workload || 0
    });

    // Add project ID to user's assignedProjects
    await User.findByIdAndUpdate(userId, {
      $addToSet: { assignedProjects: projectId }
    });

    const populatedMember = await member.populate('user', 'name rut role');

    await logAudit(
      req,
      projectId,
      'ADD_PROJECT_MEMBER',
      'TeamMember',
      member._id.toString(),
      `Added user ${userId} as ${role} (${operationalRole})`
    );

    return res.status(201).json(populatedMember);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTeamMembers = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const role = await getProjectRole(req.user._id, req.params.projectId);
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const members = await TeamMember.find({ project: req.params.projectId })
      .populate('user', 'name rut role');
    return res.json(members);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const removeTeamMember = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const member = await TeamMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Team member entry not found' });
    }

    const currentRole = await getProjectRole(req.user._id, member.project.toString());
    if (currentRole !== 'Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only project Admins can remove members.' });
    }

    await User.findByIdAndUpdate(member.user, {
      $pull: { assignedProjects: member.project }
    });

    await TeamMember.findByIdAndDelete(memberId);

    await logAudit(
      req,
      member.project.toString(),
      'REMOVE_PROJECT_MEMBER',
      'TeamMember',
      memberId,
      `Removed user ID: ${member.user}`
    );

    return res.json({ message: 'Team member removed from project successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const compareProjectStacks = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { options, criterias } = req.body;

    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Must supply at least two technology options for comparison.' });
    }

    const defaultCriterias = ['Costo', 'Escalabilidad', 'Velocidad de Desarrollo', 'Curva de Aprendizaje', 'Seguridad'];
    const activeCriterias = criterias && Array.isArray(criterias) && criterias.length > 0 ? criterias : defaultCriterias;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const role = await getProjectRole(req.user._id, projectId);
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const projectContext = {
      name: project.name,
      description: project.description,
      problem: project.problem,
      objectives: project.objectives,
      restrictions: project.restrictions
    };

    let aiResult: any;
    try {
      const response = await fetch(`${AI_SERVICE_URL}/ai/compare-stacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          options,
          criterias: activeCriterias,
          project_context: projectContext
        })
      });

      if (response.ok) {
        aiResult = await response.json();
      } else {
        const errText = await response.text();
        throw new Error(`AI Service returned code ${response.status}: ${errText}`);
      }
    } catch (err: any) {
      console.error('AI Stack Compare Error:', err);
      return res.status(502).json({ message: `El servicio de comparación de stacks con IA no está disponible: ${err.message}` });
    }

    await logAudit(
      req,
      projectId,
      'COMPARE_STACKS_AI',
      'Project',
      projectId,
      `Compared: ${options.join(' vs ')}`
    );

    return res.json(aiResult);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const generatePresentationDefense = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const role = await getProjectRole(req.user._id, projectId);
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    // 1. Fetch requirements
    const requirements = await Requirement.find({ project: projectId });

    // 2. Fetch report sections and concatenate their content summaries
    const docs = await AcademicDocument.find({ project: projectId });
    const chaptersSummary = docs
      .map(d => `Capítulo: ${d.title}\nContenido (Resumen): ${d.content ? d.content.substring(0, 500) + '...' : 'Vacío'}`)
      .join('\n\n');

    const projectContext = {
      name: project.name,
      description: project.description,
      problem: project.problem,
      objectives: project.objectives,
      companyName: project.companyName
    };

    let aiResult: any;
    try {
      const response = await fetch(`${AI_SERVICE_URL}/ai/presentation-helper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_context: projectContext,
          requirements: requirements.map(r => ({ code: r.code, title: r.title, type: r.type })),
          chapters_summary: chaptersSummary || 'No hay capítulos redactados aún en la plataforma.'
        })
      });

      if (response.ok) {
        aiResult = await response.json();
      } else {
        const errText = await response.text();
        throw new Error(`AI Service returned code ${response.status}: ${errText}`);
      }
    } catch (err: any) {
      console.error('AI Presentation Assistant Error:', err);
      return res.status(502).json({ message: `El servicio de Inteligencia Artificial no está disponible: ${err.message}` });
    }

    await logAudit(
      req,
      projectId,
      'GENERATE_DEFENSE_PLAN_AI',
      'Project',
      projectId,
      `Generated presentation defense guide with IA.`
    );

    return res.json(aiResult);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Authorization: Only system Admin or project Admin can delete
    const role = await getProjectRole(req.user._id, projectId);
    if (role !== 'Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only project Admins or system Admins can delete the project.' });
    }

    // Delete related ADRReviews first (they don't reference project directly but reference ADRDecisions)
    const adrs = await ADRDecision.find({ project: projectId }, '_id');
    const adrIds = adrs.map(a => a._id);
    if (adrIds.length > 0) {
      await ADRReview.deleteMany({ adr: { $in: adrIds } });
    }

    // Delete all cascading resources
    await TeamMember.deleteMany({ project: projectId });
    await Requirement.deleteMany({ project: projectId });
    await Meeting.deleteMany({ project: projectId });
    await ADRDecision.deleteMany({ project: projectId });
    await Notification.deleteMany({ project: projectId });
    await Diagram.deleteMany({ project: projectId });
    await Task.deleteMany({ project: projectId });
    await AcademicDocument.deleteMany({ project: projectId });
    await TraceLink.deleteMany({ project: projectId });
    await SourceDocument.deleteMany({ project: projectId });
    await AuditLog.deleteMany({ project: projectId });
    await ProjectInvite.deleteMany({ project: projectId });
    await PresenceSession.deleteMany({ project: projectId });
    await Comment.deleteMany({ project: projectId });
    await Deliverable.deleteMany({ project: projectId });
    await Approval.deleteMany({ project: projectId });

    // Pull project from all users' assignedProjects list
    await User.updateMany(
      { assignedProjects: projectId },
      { $pull: { assignedProjects: projectId } }
    );

    // Delete the project itself
    await Project.findByIdAndDelete(projectId);

    // Log global system audit
    await logAudit(
      req,
      projectId,
      'DELETE_PROJECT',
      'Project',
      projectId,
      `Deleted project: ${project.name} and all related module data.`
    );

    return res.json({ message: 'Project and all related data deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

