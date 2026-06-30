"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTraceLinksByProject = exports.deleteTraceLink = exports.createTraceLink = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const createTraceLink = async (req, res) => {
    try {
        const { project, sourceType, sourceId, targetType, targetId, linkType } = req.body;
        if (!project || !sourceType || !sourceId || !targetType || !targetId || !linkType) {
            return res.status(400).json({ message: 'All fields (project, sourceType, sourceId, targetType, targetId, linkType) are required.' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can link artifacts.' });
        }
        // Prevent duplicate links
        const existing = await models_1.TraceLink.findOne({
            project,
            sourceId,
            targetId
        });
        if (existing) {
            return res.status(400).json({ message: 'This trace link already exists.' });
        }
        const traceLink = await models_1.TraceLink.create({
            project,
            sourceType,
            sourceId,
            targetType,
            targetId,
            linkType,
            createdBy: req.user._id
        });
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_TRACE_LINK', 'TraceLink', traceLink._id.toString(), `Linked ${sourceType}(${sourceId}) to ${targetType}(${targetId}) with type ${linkType}`);
        return res.status(201).json(traceLink);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createTraceLink = createTraceLink;
const deleteTraceLink = async (req, res) => {
    try {
        const { id } = req.params;
        const traceLink = await models_1.TraceLink.findById(id);
        if (!traceLink) {
            return res.status(404).json({ message: 'Trace link not found.' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, traceLink.project.toString());
        const isCreator = traceLink.createdBy && traceLink.createdBy.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del enlace pueden eliminarlo.' });
        }
        await models_1.TraceLink.findByIdAndDelete(id);
        await (0, auditLogger_1.logAudit)(req, traceLink.project.toString(), 'DELETE_TRACE_LINK', 'TraceLink', traceLink._id.toString(), `Unlinked ${traceLink.sourceType}(${traceLink.sourceId}) from ${traceLink.targetType}(${traceLink.targetId})`);
        return res.json({ message: 'Trace link deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteTraceLink = deleteTraceLink;
const getTraceLinksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const links = await models_1.TraceLink.find({ project: projectId });
        return res.json(links);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getTraceLinksByProject = getTraceLinksByProject;
