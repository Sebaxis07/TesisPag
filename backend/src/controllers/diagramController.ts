import { Response } from 'express';
import { Diagram } from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const createDiagram = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, title, description, mermaidCode, type } = req.body;

    if (!project || !title || !mermaidCode) {
      return res.status(400).json({ message: 'Project, title, and mermaidCode are required' });
    }

    // Role check (Admin or Editor)
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, project));
    if (role !== 'Admin' && role !== 'Editor') {
      return res.status(403).json({ message: 'Only Admins or Editors can create diagrams' });
    }

    const diagram = await Diagram.create({
      project,
      owner: req.user._id,
      title,
      description: description || '',
      mermaidCode,
      type: type || 'Flowchart'
    });

    await logAudit(req, project, 'CREATE_DIAGRAM', 'Diagram', diagram._id.toString(), `Title: ${title}, Type: ${type}`);

    return res.status(201).json(diagram);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getDiagramsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (!role) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const diagrams = await Diagram.find({ project: projectId });
    return res.json(diagrams);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getDiagramById = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }

    const role = await getProjectRole(req.user._id, diagram.project.toString());
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    return res.json(diagram);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateDiagram = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }

    const role = await getProjectRole(req.user._id, diagram.project.toString());
    const isOwner = diagram.owner && diagram.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';
    const isEditor = role === 'Editor';

    if (!isAdmin && !isEditor && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para editar este diagrama.' });
    }

    Object.assign(diagram, req.body);
    await diagram.save();

    await logAudit(
      req,
      diagram.project.toString(),
      'UPDATE_DIAGRAM',
      'Diagram',
      diagram._id.toString(),
      `Title: ${diagram.title}`
    );

    return res.json(diagram);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDiagram = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }

    const role = await getProjectRole(req.user._id, diagram.project.toString());
    const isOwner = diagram.owner && diagram.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del diagrama pueden eliminarlo.' });
    }

    await Diagram.findByIdAndDelete(req.params.id);

    await logAudit(
      req,
      diagram.project.toString(),
      'DELETE_DIAGRAM',
      'Diagram',
      diagram._id.toString(),
      `Title: ${diagram.title}`
    );

    return res.json({ message: 'Diagram deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const generateDiagramAI = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId, prompt, type } = req.body;

    if (!projectId || !prompt) {
      return res.status(400).json({ message: 'Project ID and instruction prompt are required' });
    }

    // Role check (Admin or Editor)
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (role !== 'Admin' && role !== 'Editor') {
      return res.status(403).json({ message: 'Only Admins or Editors can generate diagrams' });
    }

    let mermaidCode = '';
    try {
      const response = await fetch(`${AI_SERVICE_URL}/ai/generate-diagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, type: type || 'Flowchart' })
      });

      if (response.ok) {
        const data = await response.json() as any;
        mermaidCode = data.mermaidCode;
      } else {
        throw new Error(`AI Service returned code ${response.status}`);
      }
    } catch (err) {
      console.error('AI Service Error:', err);
      return res.status(502).json({ message: 'El servicio de generación de diagramas con IA no está disponible o devolvió un error.' });
    }

    const diagram = await Diagram.create({
      project: projectId,
      owner: req.user._id,
      title: `Diagrama Generado: ${type || 'General'}`,
      description: `Generado por IA para la instrucción: "${prompt}"`,
      mermaidCode,
      type: type || 'Flowchart'
    });

    await logAudit(
      req,
      projectId,
      'GENERATE_DIAGRAM_AI',
      'Diagram',
      diagram._id.toString(),
      `Type: ${type}, Prompt: ${prompt.substring(0, 50)}...`
    );

    return res.json(diagram);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
