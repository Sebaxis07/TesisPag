import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProjectProposal, Project, TeamMember, User } from '../models';

// Create a new proposal
export const createProposal = async (req: AuthRequest, res: Response) => {
  try {
    const { title, problem, justification, generalObjective, specificObjectives, contextInstitutional, scope, risks, tentativeStack, assignedAdvisorId } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'El título es requerido' });
    }

    let assignedAdvisorName = '';
    if (assignedAdvisorId) {
      const advisor = await User.findById(assignedAdvisorId);
      if (advisor) {
        assignedAdvisorName = advisor.name;
      }
    }

    const proposal = await ProjectProposal.create({
      student: req.user._id,
      studentName: req.user.name,
      title,
      problem,
      justification,
      generalObjective,
      specificObjectives: specificObjectives || [],
      contextInstitutional,
      scope,
      risks: risks || [],
      tentativeStack: tentativeStack || [],
      assignedAdvisor: assignedAdvisorId || null,
      assignedAdvisorName,
      status: 'Draft'
    });

    return res.status(201).json(proposal);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear la propuesta', error: error.message });
  }
};

// Get proposal by ID
export const getProposalById = async (req: AuthRequest, res: Response) => {
  try {
    const proposal = await ProjectProposal.findById(req.params.id)
      .populate('student', 'name rut email')
      .populate('assignedAdvisor', 'name rut email')
      .populate('project', 'name description');

    if (!proposal) {
      return res.status(404).json({ message: 'Propuesta no encontrada' });
    }

    return res.json(proposal);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener la propuesta', error: error.message });
  }
};

// Get proposals for a student
export const getProposalsByStudent = async (req: AuthRequest, res: Response) => {
  try {
    const proposals = await ProjectProposal.find({ student: req.user._id })
      .populate('assignedAdvisor', 'name');
    return res.json(proposals);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener propuestas', error: error.message });
  }
};

// Get proposals by Project (if linked)
export const getProposalsByProject = async (req: AuthRequest, res: Response) => {
  try {
    const proposals = await ProjectProposal.find({ project: req.params.projectId })
      .populate('student', 'name')
      .populate('assignedAdvisor', 'name');
    return res.json(proposals);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener propuestas del proyecto', error: error.message });
  }
};

// Get all proposals for current Advisor / Carrera
export const getProposalsForAdvisor = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === 'Docente') {
      query = { assignedAdvisor: req.user._id };
    } else if (role === 'Coordinador') {
      // Coordinator sees all
      query = {};
    } else {
      // Commission sees proposals where they are assigned (we can also check if they are the advisor)
      query = { assignedAdvisor: req.user._id };
    }

    const proposals = await ProjectProposal.find(query)
      .populate('student', 'name rut')
      .populate('assignedAdvisor', 'name');

    return res.json(proposals);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener propuestas para revisión', error: error.message });
  }
};

// Update a proposal (only if draft or changes requested)
export const updateProposal = async (req: AuthRequest, res: Response) => {
  try {
    const { title, problem, justification, generalObjective, specificObjectives, contextInstitutional, scope, risks, tentativeStack, assignedAdvisorId } = req.body;

    const proposal = await ProjectProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Propuesta no encontrada' });
    }

    // Only creator/student can edit
    if (proposal.student.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'No tienes permiso para editar esta propuesta' });
    }

    // Don't edit if approved
    if (proposal.status === 'Approved') {
      return res.status(400).json({ message: 'No se puede editar una propuesta ya aprobada' });
    }

    proposal.title = title || proposal.title;
    proposal.problem = problem !== undefined ? problem : proposal.problem;
    proposal.justification = justification !== undefined ? justification : proposal.justification;
    proposal.generalObjective = generalObjective !== undefined ? generalObjective : proposal.generalObjective;
    proposal.specificObjectives = specificObjectives || proposal.specificObjectives;
    proposal.contextInstitutional = contextInstitutional !== undefined ? contextInstitutional : proposal.contextInstitutional;
    proposal.scope = scope !== undefined ? scope : proposal.scope;
    proposal.risks = risks || proposal.risks;
    proposal.tentativeStack = tentativeStack || proposal.tentativeStack;

    if (assignedAdvisorId) {
      const advisor = await User.findById(assignedAdvisorId);
      if (advisor) {
        proposal.assignedAdvisor = assignedAdvisorId;
        proposal.assignedAdvisorName = advisor.name;
      }
    }

    await proposal.save();
    return res.json(proposal);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar la propuesta', error: error.message });
  }
};

// Submit proposal for review
export const submitProposal = async (req: AuthRequest, res: Response) => {
  try {
    const proposal = await ProjectProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Propuesta no encontrada' });
    }

    if (proposal.student.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'No tienes permiso para enviar esta propuesta' });
    }

    proposal.status = 'Submitted';
    proposal.submittedAt = new Date();
    await proposal.save();

    return res.json(proposal);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al enviar la propuesta', error: error.message });
  }
};

// Review proposal (accept / reject / observations)
export const reviewProposal = async (req: AuthRequest, res: Response) => {
  try {
    const { status, feedback } = req.body; // Approved, ChangesRequested, Rejected

    if (!['Approved', 'ChangesRequested', 'Rejected', 'InReview'].includes(status)) {
      return res.status(400).json({ message: 'Estado de revisión inválido' });
    }

    const proposal = await ProjectProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Propuesta no encontrada' });
    }

    // Check if the user is the advisor or a Coordinator
    const isAdvisor = proposal.assignedAdvisor && proposal.assignedAdvisor.toString() === req.user._id.toString();
    const isCoordinator = req.user.role === 'Coordinador' || req.user.role === 'Admin';

    if (!isAdvisor && !isCoordinator) {
      return res.status(403).json({ message: 'No tienes permisos para revisar esta propuesta' });
    }

    proposal.status = status;
    proposal.feedback = feedback || proposal.feedback;
    proposal.reviewedAt = new Date();

    // If approved, let's create a formal Project in the database (or link to existing one)
    if (status === 'Approved' && !proposal.project) {
      // Create Project
      const project = await Project.create({
        name: proposal.title,
        description: proposal.justification,
        problem: proposal.problem,
        objectives: proposal.generalObjective + '\n\nObjetivos Específicos:\n' + proposal.specificObjectives.map(o => `- ${o}`).join('\n'),
        companyName: proposal.contextInstitutional || 'N/A',
        methodology: 'Scrum' // Default methodology
      });

      proposal.project = project._id as any;

      // Add student and advisor as Team Members
      await TeamMember.create({
        user: proposal.student,
        project: project._id,
        role: 'Admin', // Student has Admin role in their own project
        operationalRole: 'Estudiante Tesista',
        workload: 100
      });

      if (proposal.assignedAdvisor) {
        await TeamMember.create({
          user: proposal.assignedAdvisor,
          project: project._id,
          role: 'Viewer', // Advisor acts as Viewer/Reviewer in the student's project
          operationalRole: 'Docente Guía',
          workload: 10
        });
      }
    }

    await proposal.save();
    return res.json(proposal);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Error al revisar la propuesta', error: error.message });
  }
};
