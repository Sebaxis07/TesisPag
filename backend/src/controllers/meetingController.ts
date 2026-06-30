import { Response } from 'express';
import { Meeting } from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const createMeeting = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, title, date, transcription, summary, agreements, tasks, risks } = req.body;

    if (!project || !title) {
      return res.status(400).json({ message: 'Project and title are required' });
    }

    // Role check (Admin or Editor)
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, project));
    if (role !== 'Admin' && role !== 'Editor') {
      return res.status(403).json({ message: 'Only Admins or Editors can create meetings' });
    }

    const meeting = await Meeting.create({
      project,
      owner: req.user._id,
      title,
      date: date || new Date(),
      transcription: transcription || '',
      summary: summary || '',
      agreements: agreements || [],
      tasks: tasks || [],
      risks: risks || []
    });

    await logAudit(req, project, 'CREATE_MEETING', 'Meeting', meeting._id.toString(), `Title: ${title}`);

    return res.status(201).json(meeting);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMeetingsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (!role) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const meetings = await Meeting.find({ project: projectId }).sort({ date: -1 });
    return res.json(meetings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMeetingById = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const role = await getProjectRole(req.user._id, meeting.project.toString());
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    return res.json(meeting);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMeeting = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const role = await getProjectRole(req.user._id, meeting.project.toString());
    const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';
    const isEditor = role === 'Editor';

    if (!isAdmin && !isEditor && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para editar esta minuta.' });
    }

    Object.assign(meeting, req.body);
    await meeting.save();

    await logAudit(
      req,
      meeting.project.toString(),
      'UPDATE_MEETING',
      'Meeting',
      meeting._id.toString(),
      `Title: ${meeting.title}`
    );

    return res.json(meeting);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMeeting = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const role = await getProjectRole(req.user._id, meeting.project.toString());
    const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador de la minuta pueden eliminarla.' });
    }

    await Meeting.findByIdAndDelete(req.params.id);

    await logAudit(
      req,
      meeting.project.toString(),
      'DELETE_MEETING',
      'Meeting',
      meeting._id.toString(),
      `Title: ${meeting.title}`
    );

    return res.json({ message: 'Meeting deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const triggerAISummary = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const role = await getProjectRole(req.user._id, meeting.project.toString());
    const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';
    const isEditor = role === 'Editor';

    if (!isAdmin && !isEditor && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para ejecutar el resumen de esta minuta.' });
    }

    if (!meeting.transcription || meeting.transcription.trim().length === 0) {
      return res.status(400).json({ message: 'Transcription or notes text is required to generate summary' });
    }

    let aiResult: any;
    try {
      const response = await fetch(`${AI_SERVICE_URL}/ai/summarize-meeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcription: meeting.transcription })
      });

      if (response.ok) {
        aiResult = await response.json();
      } else {
        throw new Error(`AI Service returned code ${response.status}`);
      }
    } catch (err) {
      console.error('AI Service Error:', err);
      return res.status(502).json({ message: 'El servicio de IA para resúmenes de minutas no está disponible.' });
    }

    meeting.summary = aiResult.summary;
    meeting.agreements = aiResult.agreements;
    meeting.tasks = aiResult.tasks;
    meeting.risks = aiResult.risks;
    await meeting.save();

    await logAudit(
      req,
      meeting.project.toString(),
      'TRIGGER_MEETING_AI_SUMMARY',
      'Meeting',
      meeting._id.toString(),
      `Title: ${meeting.title}`
    );

    return res.json(meeting);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
