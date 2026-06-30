import { Response } from 'express';
import { Deliverable, TeamMember, Notification } from '../models';
import { ProjectAuthRequest } from '../middleware/auth';
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

    const member = await TeamMember.findOne({ project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member.role !== 'Admin' && member.role !== 'Editor') {
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

    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member.role !== 'Admin' && member.role !== 'Editor') {
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
        await Notification.create({
          user: pm.user,
          project: deliverable.project,
          message: `Se subió la Versión ${nextVer} para el entregable "${deliverable.name}" por ${req.user.name}.`,
          link: '/entregables',
          isRead: false
        });
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

    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member.role !== 'Admin') {
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
    const member = await TeamMember.findOne({ project: deliverable.project, user: req.user._id });
    if (!member) {
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
