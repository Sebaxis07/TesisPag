"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasksByProject = exports.createTask = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const createTask = async (req, res) => {
    try {
        const { project, title, description, assignedTo, status, dueDate, sprint } = req.body;
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
        Object.assign(task, req.body);
        await task.save();
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
        await models_1.Task.findByIdAndDelete(req.params.id);
        await (0, auditLogger_1.logAudit)(req, task.project.toString(), 'DELETE_TASK', 'Task', task._id.toString(), `Title: ${task.title}`);
        return res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteTask = deleteTask;
