"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasksByProject = exports.createTask = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const requirementStatusHelper_1 = require("../utils/requirementStatusHelper");
const createTask = async (req, res) => {
    try {
        const { project, title, description, assignedTo, status, dueDate, sprint, linkedRequirements } = req.body;
        if (!project || !title) {
            return res.status(400).json({ message: 'Project and title are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create tasks' });
        }
        const task = await models_1.Task.create({
            project,
            owner: req.user._id,
            title,
            description: description || '',
            assignedTo: assignedTo || null,
            status: status || 'Todo',
            dueDate: dueDate || null,
            sprint: sprint || 'General'
        });
        // Link requirements if provided
        if (Array.isArray(linkedRequirements) && linkedRequirements.length > 0) {
            for (const reqId of linkedRequirements) {
                await models_1.TraceLink.create({
                    project,
                    sourceType: 'Requirement',
                    sourceId: reqId,
                    targetType: 'Task',
                    targetId: task._id,
                    linkType: 'implements',
                    createdBy: req.user._id
                });
                await models_1.Requirement.findByIdAndUpdate(reqId, {
                    $addToSet: { linkedTasks: task._id }
                });
                await (0, requirementStatusHelper_1.recalculateRequirementStatus)(reqId);
            }
        }
        const populatedTask = await task.populate('assignedTo', 'name rut');
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_TASK', 'Task', task._id.toString(), `Title: ${title}`);
        return res.status(201).json(populatedTask);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createTask = createTask;
const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const tasks = await models_1.Task.find({ project: projectId })
            .populate('assignedTo', 'name rut')
            .sort({ createdAt: -1 });
        return res.json(tasks);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getTasksByProject = getTasksByProject;
const getTaskById = async (req, res) => {
    try {
        const task = await models_1.Task.findById(req.params.id).populate('assignedTo', 'name rut');
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, task.project.toString());
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        return res.json(task);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getTaskById = getTaskById;
const updateTask = async (req, res) => {
    try {
        const task = await models_1.Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, task.project.toString());
        const isOwner = task.owner && task.owner.toString() === req.user._id.toString();
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        // Policy: Editor/Admin, Owner, or the Assigned User can update the task details/status.
        if (!isAdmin && !isEditor && !isOwner && !isAssigned) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar esta tarea.' });
        }
        // Check if linkedRequirements is passed
        const { linkedRequirements, ...taskData } = req.body;
        Object.assign(task, taskData);
        await task.save();
        if (Array.isArray(linkedRequirements)) {
            // Find current TraceLinks for this task
            const currentLinks = await models_1.TraceLink.find({
                project: task.project,
                targetType: 'Task',
                targetId: task._id,
                sourceType: 'Requirement'
            });
            const currentReqIds = currentLinks.map(l => l.sourceId.toString());
            const targetReqIds = linkedRequirements.map(id => id.toString());
            // Find to delete
            const toDelete = currentLinks.filter(l => !targetReqIds.includes(l.sourceId.toString()));
            for (const link of toDelete) {
                const reqId = link.sourceId.toString();
                await models_1.TraceLink.findByIdAndDelete(link._id);
                await models_1.Requirement.findByIdAndUpdate(reqId, {
                    $pull: { linkedTasks: task._id }
                });
                await (0, requirementStatusHelper_1.recalculateRequirementStatus)(reqId);
            }
            // Find to add
            const toAdd = targetReqIds.filter(id => !currentReqIds.includes(id));
            for (const reqId of toAdd) {
                await models_1.TraceLink.create({
                    project: task.project,
                    sourceType: 'Requirement',
                    sourceId: reqId,
                    targetType: 'Task',
                    targetId: task._id,
                    linkType: 'implements',
                    createdBy: req.user._id
                });
                await models_1.Requirement.findByIdAndUpdate(reqId, {
                    $addToSet: { linkedTasks: task._id }
                });
                await (0, requirementStatusHelper_1.recalculateRequirementStatus)(reqId);
            }
        }
        else {
            // Recalculate linked requirement states
            await (0, requirementStatusHelper_1.recalculateRequirementsForTask)(task._id.toString());
        }
        const populatedTask = await task.populate('assignedTo', 'name rut');
        await (0, auditLogger_1.logAudit)(req, task.project.toString(), 'UPDATE_TASK', 'Task', task._id.toString(), `Title: ${task.title}, Status: ${task.status}`);
        return res.json(populatedTask);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const task = await models_1.Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, task.project.toString());
        const isOwner = task.owner && task.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador de la tarea pueden eliminarla.' });
        }
        // Find and delete trace links, updating requirements
        const links = await models_1.TraceLink.find({
            project: task.project,
            $or: [
                { sourceType: 'Task', sourceId: task._id },
                { targetType: 'Task', targetId: task._id }
            ]
        });
        for (const link of links) {
            const isSourceReq = link.sourceType === 'Requirement';
            const isTargetReq = link.targetType === 'Requirement';
            const reqId = isSourceReq ? link.sourceId : isTargetReq ? link.targetId : null;
            if (reqId) {
                await models_1.Requirement.findByIdAndUpdate(reqId, {
                    $pull: { linkedTasks: task._id }
                });
            }
            await models_1.TraceLink.findByIdAndDelete(link._id);
        }
        await models_1.Task.findByIdAndDelete(req.params.id);
        // Recalculate status for all affected requirements
        for (const link of links) {
            const isSourceReq = link.sourceType === 'Requirement';
            const isTargetReq = link.targetType === 'Requirement';
            const reqId = isSourceReq ? link.sourceId : isTargetReq ? link.targetId : null;
            if (reqId) {
                await (0, requirementStatusHelper_1.recalculateRequirementStatus)(reqId.toString());
            }
        }
        await (0, auditLogger_1.logAudit)(req, task.project.toString(), 'DELETE_TASK', 'Task', task._id.toString(), `Title: ${task.title}`);
        return res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteTask = deleteTask;
