"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectComments = exports.resolveComment = exports.replyComment = exports.createComment = void 0;
const models_1 = require("../models");
const auditLogger_1 = require("../utils/auditLogger");
// 1. Create a root comment
const createComment = async (req, res) => {
    try {
        const { project, resourceType, resourceId, content } = req.body;
        if (!project || !resourceType || !resourceId || !content) {
            return res.status(400).json({ message: 'Project, resourceType, resourceId, and content are required.' });
        }
        // Check commenter permission
        const member = await models_1.TeamMember.findOne({ project, user: req.user._id });
        if (!member) {
            return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
        }
        if (member.canComment === false) {
            return res.status(403).json({ message: 'No tienes permisos de escritura o comentarios en este proyecto.' });
        }
        const comment = await models_1.Comment.create({
            project,
            user: req.user._id,
            userName: req.user.name,
            resourceType,
            resourceId,
            content,
            isResolved: false,
            replies: []
        });
        await (0, auditLogger_1.logAudit)(req, project.toString(), 'CREATE_COMMENT', 'Comment', comment._id.toString(), `Comment posted on ${resourceType}: ${resourceId}`);
        return res.status(201).json(comment);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createComment = createComment;
// 2. Add reply to a comment thread
const replyComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Content is required.' });
        }
        const comment = await models_1.Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado.' });
        }
        // Check permission
        const member = await models_1.TeamMember.findOne({ project: comment.project, user: req.user._id });
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
            await models_1.Notification.create({
                user: comment.user,
                project: comment.project,
                message: `${req.user.name} respondió a tu comentario: "${content.substring(0, 30)}..."`,
                link: '/observaciones',
                isRead: false
            });
        }
        await (0, auditLogger_1.logAudit)(req, comment.project.toString(), 'REPLY_COMMENT', 'Comment', comment._id.toString(), `Reply added to thread ${comment._id}`);
        return res.json(comment);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.replyComment = replyComment;
// 3. Mark comment thread as resolved
const resolveComment = async (req, res) => {
    try {
        const { id } = req.params;
        const comment = await models_1.Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado.' });
        }
        // Must be project member
        const member = await models_1.TeamMember.findOne({ project: comment.project, user: req.user._id });
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
            await models_1.Notification.create({
                user: comment.user,
                project: comment.project,
                message: `${req.user.name} resolvió tu comentario sobre ${comment.resourceType}.`,
                link: '/observaciones',
                isRead: false
            });
        }
        await (0, auditLogger_1.logAudit)(req, comment.project.toString(), 'RESOLVE_COMMENT', 'Comment', comment._id.toString(), `Comment thread resolved.`);
        return res.json(comment);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.resolveComment = resolveComment;
// 4. Get comments for a project, optionally filtered by resource type & ID
const getProjectComments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { resourceType, resourceId } = req.query;
        const filter = { project: projectId };
        if (resourceType)
            filter.resourceType = resourceType;
        if (resourceId)
            filter.resourceId = resourceId;
        const comments = await models_1.Comment.find(filter).sort({ createdAt: 1 });
        return res.json(comments);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getProjectComments = getProjectComments;
