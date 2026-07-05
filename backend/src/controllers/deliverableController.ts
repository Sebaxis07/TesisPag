import { Response } from 'express';
import { Deliverable, TeamMember, Notification } from '../models';
import { notifyUser } from '../utils/notificationHelper';
import { AuthRequest, ProjectAuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../../uploads/deliverables');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 1. Create a deliverable placeholder
export const createDeliverable = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, name, description, dueDate } = req.body;

    if (!project || !name || !dueDate) {
      return res.status(400).json({ message: 'El proyecto, nombre y fecha límite son obligatorios.' });
    }

    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    const member = await TeamMember.findOne({ project, user: req.user._id });
    if (!member && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member && member.role !== 'Admin' && member.role !== 'Editor' && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Solo los Administradores o Editores pueden crear entregables.' });
    }

    const deliverable = await Deliverable.create({
      project,
      name,
      description,
      dueDate: new Date(dueDate),
      status: 'Pending',
      versions: []
    });

    await logAudit(
      req,
      project.toString(),
      'CREATE_DELIVERABLE',
      'Deliverable',
      deliverable._id.toString(),
      `Entregable creado: ${name}`
    );

    return res.status(201).json(deliverable);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Upload a new version to a deliverable
export const uploadVersion = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment = '' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Se requiere subir un archivo.' });
    }

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    if (deliverable.status === 'Finalized') {
      return res.status(400).json({ message: 'Este entregable está finalizado (congelado) y no acepta más versiones.' });
    }

    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member && member.role !== 'Admin' && member.role !== 'Editor' && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Solo Administradores o Editores pueden subir versiones.' });
    }

    // Save file physically
    const uniqueFilename = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, file.buffer);

    const nextVer = deliverable.versions.length + 1;
    deliverable.versions.push({
      versionNumber: nextVer,
      filename: file.originalname,
      fileSize: file.size,
      filePath: uniqueFilename,
      comment,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      createdAt: new Date()
    });

    deliverable.status = 'InReview';
    await deliverable.save();

    // Create notifications for team members
    const projectMembers = await TeamMember.find({ project: deliverable.project });
    for (const pm of projectMembers) {
      if (pm.user.toString() !== req.user._id.toString()) {
        await notifyUser(
          pm.user,
          deliverable.project,
          'milestones',
          'Nueva versión de entregable',
          `Se subió la Versión ${nextVer} para el entregable "${deliverable.name}" por ${req.user.name}.`,
          '/entregables'
        );
      }
    }

    await logAudit(
      req,
      deliverable.project.toString(),
      'UPLOAD_DELIVERABLE_VERSION',
      'Deliverable',
      deliverable._id.toString(),
      `Versión ${nextVer} subida para: ${deliverable.name}`
    );

    return res.json(deliverable);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Freeze deliverable (Finalize it)
export const freezeDeliverable = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member && member.role !== 'Admin' && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Solo los Administradores de proyecto pueden congelar un entregable.' });
    }

    deliverable.status = 'Finalized';
    await deliverable.save();

    await logAudit(
      req,
      deliverable.project.toString(),
      'FREEZE_DELIVERABLE',
      'Deliverable',
      deliverable._id.toString(),
      `Entregable congelado en su versión final: ${deliverable.name}`
    );

    return res.json(deliverable);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Get all deliverables for a project
export const getProjectDeliverables = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const deliverables = await Deliverable.find({ project: projectId }).sort({ dueDate: 1 });
    return res.json(deliverables);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Download deliverable version
export const downloadVersion = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id, versionNumber } = req.params;
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    // Check project member
    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const versionNum = parseInt(versionNumber, 10);
    const version = deliverable.versions.find(v => v.versionNumber === versionNum);
    if (!version) {
      return res.status(404).json({ message: 'Versión del entregable no encontrada.' });
    }

    const filePath = path.join(UPLOADS_DIR, version.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'El archivo físico no existe en el servidor.' });
    }

    return res.download(filePath, version.filename);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 6. Approve or request changes for a specific version of a deliverable
export const approveDeliverableVersion = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id, versionNumber } = req.params;
    const { advisorApprovalStatus, advisorApprovalFeedback = '' } = req.body;

    if (!advisorApprovalStatus || !['Approved', 'ChangesRequested'].includes(advisorApprovalStatus)) {
      return res.status(400).json({ message: 'El estado de aprobación debe ser "Approved" o "ChangesRequested".' });
    }

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    // Check user role
    const hasPermission = ['Docente', 'Evaluador', 'Coordinador'].includes(req.user.role);
    if (!hasPermission) {
      return res.status(430).json({ message: 'Solo los supervisores académicos (Docentes, Evaluadores o Coordinación) pueden realizar esta revisión.' });
    }

    const verNum = parseInt(versionNumber, 10);
    const versionIndex = deliverable.versions.findIndex(v => v.versionNumber === verNum);
    if (versionIndex === -1) {
      return res.status(404).json({ message: 'Versión del entregable no encontrada.' });
    }

    // Update version approval fields
    deliverable.versions[versionIndex].advisorApprovalStatus = advisorApprovalStatus;
    deliverable.versions[versionIndex].advisorApprovalFeedback = advisorApprovalFeedback;

    // Update overall deliverable status as well
    if (advisorApprovalStatus === 'Approved') {
      deliverable.status = 'Approved';
    } else if (advisorApprovalStatus === 'ChangesRequested') {
      deliverable.status = 'ChangesRequested';
    }

    await deliverable.save();

    // Create notifications for team members
    const projectMembers = await TeamMember.find({ project: deliverable.project });
    for (const pm of projectMembers) {
      if (pm.user.toString() !== req.user._id.toString()) {
        await notifyUser(
          pm.user,
          deliverable.project,
          'milestones',
          advisorApprovalStatus === 'Approved' ? 'Entregable Aprobado' : 'Cambios Solicitados en Entregable',
          `El entregable "${deliverable.name}" (Versión ${verNum}) fue revisado por ${req.user.name}: ${advisorApprovalStatus === 'Approved' ? 'Aprobado' : 'Se solicitan cambios'}.`,
          '/entregables'
        );
      }
    }

    await logAudit(
      req,
      deliverable.project.toString(),
      'APPROVE_DELIVERABLE_VERSION',
      'Deliverable',
      deliverable._id.toString(),
      `Revisión registrada por ${req.user.name} para V${verNum} con veredicto: ${advisorApprovalStatus}`
    );

    return res.json(deliverable);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateDeliverable = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, dueDate, status } = req.body;

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    if (name) deliverable.name = name;
    if (description !== undefined) deliverable.description = description;
    if (dueDate) deliverable.dueDate = new Date(dueDate);
    if (status) deliverable.status = status;

    await deliverable.save();

    await logAudit(
      req,
      deliverable.project.toString(),
      'UPDATE_DELIVERABLE',
      'Deliverable',
      deliverable._id.toString(),
      `Entregable actualizado por ${req.user.name}: ${deliverable.name}`
    );

    return res.json(deliverable);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDeliverable = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Entregable no encontrado.' });
    }

    const projectId = deliverable.project.toString();
    const name = deliverable.name;

    await Deliverable.findByIdAndDelete(id);

    await logAudit(
      req,
      projectId,
      'DELETE_DELIVERABLE',
      'Deliverable',
      id,
      `Entregable "${name}" eliminado por ${req.user.name}`
    );

    return res.json({ message: 'Entregable eliminado con éxito.' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
