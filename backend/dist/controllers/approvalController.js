"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectApprovals = exports.submitApproval = exports.requestApproval = void 0;
const models_1 = require("../models");
const auditLogger_1 = require("../utils/auditLogger");
// 1. Request formal approval for an item
const requestApproval = async (req, res) => {
    try {
        const { project, itemType, itemId, title, requiredApprovalsCount = 1 } = req.body;
        if (!project || !itemType || !itemId || !title) {
            return res.status(400).json({ message: 'El proyecto, tipo de elemento, ID del elemento y título son obligatorios.' });
        }
        const member = await models_1.TeamMember.findOne({ project, user: req.user._id });
        if (!member) {
            return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
        }
        if (member.role !== 'Admin' && member.role !== 'Editor') {
            return res.status(403).json({ message: 'Solo Administradores o Editores pueden solicitar aprobaciones.' });
        }
        // Check if an active pending approval already exists
        const existing = await models_1.Approval.findOne({ project, itemType, itemId, status: 'Pending' });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una solicitud de aprobación pendiente para este elemento.' });
        }
        // Update status of underlying element if applicable
        if (itemType === 'Deliverable') {
            await models_1.Deliverable.findByIdAndUpdate(itemId, { status: 'InReview' });
        }
        else if (itemType === 'ADRDecision') {
            await models_1.ADRDecision.findByIdAndUpdate(itemId, { status: 'InReview' });
        }
        const approval = await models_1.Approval.create({
            project,
            itemType,
            itemId,
            title,
            status: 'Pending',
            requestedBy: req.user._id,
            requestedByName: req.user.name,
            approvals: [],
            requiredApprovalsCount,
            currentApprovalsCount: 0
        });
        // Notify all project Viewers (teachers/clients) and Admins
        const projectMembers = await models_1.TeamMember.find({ project });
        for (const pm of projectMembers) {
            if (pm.user.toString() !== req.user._id.toString() && (pm.role === 'Viewer' || pm.role === 'Admin')) {
                await models_1.Notification.create({
                    user: pm.user,
                    project,
                    message: `Se solicita revisión de aprobación para: "${title}".`,
                    link: '/aprobaciones',
                    isRead: false
                });
            }
        }
        await (0, auditLogger_1.logAudit)(req, project.toString(), 'REQUEST_APPROVAL', 'Approval', approval._id.toString(), `Solicitud de aprobación creada para ${itemType}: ${title}`);
        return res.status(201).json(approval);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.requestApproval = requestApproval;
// 2. Submit review decision (Approve/Reject/Request Changes)
const submitApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note = '' } = req.body; // status: 'Approved' | 'Rejected' | 'ChangesRequested'
        if (!['Approved', 'Rejected', 'ChangesRequested'].includes(status)) {
            return res.status(400).json({ message: 'Estado inválido. Debe ser Approved, Rejected o ChangesRequested.' });
        }
        const approval = await models_1.Approval.findById(id);
        if (!approval) {
            return res.status(404).json({ message: 'Solicitud de aprobación no encontrada.' });
        }
        const member = await models_1.TeamMember.findOne({ project: approval.project, user: req.user._id });
        if (!member) {
            return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
        }
        // Update or push reviewer's decision
        const existingIndex = approval.approvals.findIndex(a => a.user.toString() === req.user._id.toString());
        if (existingIndex > -1) {
            approval.approvals[existingIndex] = {
                user: req.user._id,
                userName: req.user.name,
                status,
                note,
                updatedAt: new Date()
            };
        }
        else {
            approval.approvals.push({
                user: req.user._id,
                userName: req.user.name,
                status,
                note,
                updatedAt: new Date()
            });
        }
        // Recalculate status
        const approves = approval.approvals.filter(a => a.status === 'Approved');
        const rejects = approval.approvals.filter(a => a.status === 'Rejected');
        const changes = approval.approvals.filter(a => a.status === 'ChangesRequested');
        approval.currentApprovalsCount = approves.length;
        let finalStatus = 'Pending';
        if (changes.length > 0) {
            finalStatus = 'ChangesRequested';
        }
        else if (rejects.length > 0) {
            finalStatus = 'Rejected';
        }
        else if (approves.length >= approval.requiredApprovalsCount) {
            finalStatus = 'Approved';
        }
        approval.status = finalStatus;
        await approval.save();
        // Propagate finalStatus to underlying items
        if (finalStatus === 'Approved') {
            if (approval.itemType === 'Requirement') {
                await models_1.Requirement.findByIdAndUpdate(approval.itemId, { status: 'Approved' });
            }
            else if (approval.itemType === 'Deliverable') {
                await models_1.Deliverable.findByIdAndUpdate(approval.itemId, { status: 'Approved' });
            }
            else if (approval.itemType === 'ADRDecision') {
                await models_1.ADRDecision.findByIdAndUpdate(approval.itemId, { status: 'Accepted', acceptedAt: new Date() });
            }
        }
        else if (finalStatus === 'ChangesRequested' || finalStatus === 'Rejected') {
            const dbStatus = finalStatus === 'ChangesRequested' ? 'ChangesRequested' : 'Rejected';
            if (approval.itemType === 'Requirement') {
                await models_1.Requirement.findByIdAndUpdate(approval.itemId, { status: 'Draft' }); // Rollback to draft
            }
            else if (approval.itemType === 'Deliverable') {
                await models_1.Deliverable.findByIdAndUpdate(approval.itemId, { status: dbStatus });
            }
            else if (approval.itemType === 'ADRDecision') {
                await models_1.ADRDecision.findByIdAndUpdate(approval.itemId, { status: dbStatus, reviewedAt: new Date() });
            }
        }
        // Notify requester
        await models_1.Notification.create({
            user: approval.requestedBy,
            project: approval.project,
            message: `El revisor ${req.user.name} marcó tu solicitud "${approval.title}" como ${status}.`,
            link: '/aprobaciones',
            isRead: false
        });
        await (0, auditLogger_1.logAudit)(req, approval.project.toString(), 'SUBMIT_APPROVAL_DECISION', 'Approval', approval._id.toString(), `Revisión enviada por ${req.user.name}: ${status}`);
        return res.json(approval);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.submitApproval = submitApproval;
// 3. Get all approvals for a project
const getProjectApprovals = async (req, res) => {
    try {
        const { projectId } = req.params;
        const approvals = await models_1.Approval.find({ project: projectId }).sort({ createdAt: -1 });
        return res.json(approvals);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getProjectApprovals = getProjectApprovals;
