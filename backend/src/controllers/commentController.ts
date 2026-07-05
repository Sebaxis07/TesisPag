import { Response } from 'express';
import { Comment, TeamMember, Notification } from '../models';
import { notifyUser } from '../utils/notificationHelper';
import { ProjectAuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

// 1. Create a root comment
export const createComment = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, resourceType, resourceId, content } = req.body;

    if (!project || !resourceType || !resourceId || !content) {
      return res.status(400).json({ message: 'Project, resourceType, resourceId, and content are required.' });
    }

    // Check commenter permission
    const member = await TeamMember.findOne({ project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member.canComment === false) {
      return res.status(403).json({ message: 'No tienes permisos de escritura o comentarios en este proyecto.' });
    }

    const comment = await Comment.create({
      project,
      user: req.user._id,
      userName: req.user.name,
      resourceType,
      resourceId,
      content,
      isResolved: false,
      replies: []
    });

    await logAudit(
      req,
      project.toString(),
      'CREATE_COMMENT',
      'Comment',
      comment._id.toString(),
      `Comment posted on ${resourceType}: ${resourceId}`
    );

    return res.status(201).json(comment);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Add reply to a comment thread
export const replyComment = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required.' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado.' });
    }

    // Check permission
    const member = await TeamMember.findOne({ project: comment.project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    if (member.canComment === false) {
      return res.status(403).json({ message: 'No tienes permisos de escritura o comentarios en este proyecto.' });
    }

    comment.replies.push({
      user: req.user._id,
      userName: req.user.name,
      content,
      createdAt: new Date()
    });

    await comment.save();

    if (comment.user.toString() !== req.user._id.toString()) {
      await notifyUser(
        comment.user,
        comment.project,
        'comments',
        'Respuesta a comentario',
        `${req.user.name} respondió a tu comentario: "${content.substring(0, 30)}..."`,
        '/observaciones'
      );
    }

    await logAudit(
      req,
      comment.project.toString(),
      'REPLY_COMMENT',
      'Comment',
      comment._id.toString(),
      `Reply added to thread ${comment._id}`
    );

    return res.json(comment);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Mark comment thread as resolved
export const resolveComment = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado.' });
    }

    // Must be project member
    const member = await TeamMember.findOne({ project: comment.project, user: req.user._id });
    if (!member) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    // Only Admin/Editor or the original commenter can resolve
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isProjectManager = member.role === 'Admin' || member.role === 'Editor';

    if (!isOwner && !isProjectManager) {
      return res.status(403).json({ message: 'No tienes permisos para resolver este comentario.' });
    }

    comment.isResolved = true;
    comment.resolvedBy = req.user._id;
    comment.resolvedAt = new Date();
    await comment.save();

    if (comment.user.toString() !== req.user._id.toString()) {
      await notifyUser(
        comment.user,
        comment.project,
        'comments',
        'Comentario resuelto',
        `${req.user.name} resolvió tu comentario sobre ${comment.resourceType}.`,
        '/observaciones'
      );
    }

    await logAudit(
      req,
      comment.project.toString(),
      'RESOLVE_COMMENT',
      'Comment',
      comment._id.toString(),
      `Comment thread resolved.`
    );

    return res.json(comment);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Get comments for a project, optionally filtered by resource type & ID
export const getProjectComments = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { resourceType, resourceId } = req.query;

    const filter: any = { project: projectId };
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;

    const comments = await Comment.find(filter).sort({ createdAt: 1 });
    return res.json(comments);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
