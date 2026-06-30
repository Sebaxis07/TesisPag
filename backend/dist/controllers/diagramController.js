"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiagramAI = exports.deleteDiagram = exports.updateDiagram = exports.getDiagramById = exports.getDiagramsByProject = exports.createDiagram = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createDiagram = async (req, res) => {
    try {
        const { project, title, description, mermaidCode, type } = req.body;
        if (!project || !title || !mermaidCode) {
            return res.status(400).json({ message: 'Project, title, and mermaidCode are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create diagrams' });
        }
        const diagram = await models_1.Diagram.create({
            project,
            owner: req.user._id,
            title,
            description: description || '',
            mermaidCode,
            type: type || 'Flowchart'
        });
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_DIAGRAM', 'Diagram', diagram._id.toString(), `Title: ${title}, Type: ${type}`);
        return res.status(201).json(diagram);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createDiagram = createDiagram;
const getDiagramsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const diagrams = await models_1.Diagram.find({ project: projectId });
        return res.json(diagrams);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getDiagramsByProject = getDiagramsByProject;
const getDiagramById = async (req, res) => {
    try {
        const diagram = await models_1.Diagram.findById(req.params.id);
        if (!diagram) {
            return res.status(404).json({ message: 'Diagram not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, diagram.project.toString());
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        return res.json(diagram);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getDiagramById = getDiagramById;
const updateDiagram = async (req, res) => {
    try {
        const diagram = await models_1.Diagram.findById(req.params.id);
        if (!diagram) {
            return res.status(404).json({ message: 'Diagram not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, diagram.project.toString());
        const isOwner = diagram.owner && diagram.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para editar este diagrama.' });
        }
        Object.assign(diagram, req.body);
        await diagram.save();
        await (0, auditLogger_1.logAudit)(req, diagram.project.toString(), 'UPDATE_DIAGRAM', 'Diagram', diagram._id.toString(), `Title: ${diagram.title}`);
        return res.json(diagram);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateDiagram = updateDiagram;
const deleteDiagram = async (req, res) => {
    try {
        const diagram = await models_1.Diagram.findById(req.params.id);
        if (!diagram) {
            return res.status(404).json({ message: 'Diagram not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, diagram.project.toString());
        const isOwner = diagram.owner && diagram.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del diagrama pueden eliminarlo.' });
        }
        await models_1.Diagram.findByIdAndDelete(req.params.id);
        await (0, auditLogger_1.logAudit)(req, diagram.project.toString(), 'DELETE_DIAGRAM', 'Diagram', diagram._id.toString(), `Title: ${diagram.title}`);
        return res.json({ message: 'Diagram deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteDiagram = deleteDiagram;
const generateDiagramAI = async (req, res) => {
    try {
        const { projectId, prompt, type } = req.body;
        if (!projectId || !prompt) {
            return res.status(400).json({ message: 'Project ID and instruction prompt are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
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
                const data = await response.json();
                mermaidCode = data.mermaidCode;
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Error:', err);
            return res.status(502).json({ message: 'El servicio de generación de diagramas con IA no está disponible o devolvió un error.' });
        }
        const diagram = await models_1.Diagram.create({
            project: projectId,
            owner: req.user._id,
            title: `Diagrama Generado: ${type || 'General'}`,
            description: `Generado por IA para la instrucción: "${prompt}"`,
            mermaidCode,
            type: type || 'Flowchart'
        });
        await (0, auditLogger_1.logAudit)(req, projectId, 'GENERATE_DIAGRAM_AI', 'Diagram', diagram._id.toString(), `Type: ${type}, Prompt: ${prompt.substring(0, 50)}...`);
        return res.json(diagram);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.generateDiagramAI = generateDiagramAI;
