"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportSectionAI = exports.deleteDocument = exports.updateDocument = exports.getDocumentById = exports.getDocumentsByProject = exports.createDocument = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createDocument = async (req, res) => {
    try {
        const { project, title, templateType, content, status } = req.body;
        if (!project || !title) {
            return res.status(400).json({ message: 'Project and title are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create documents' });
        }
        const doc = await models_1.Document.create({
            project,
            owner: req.user._id,
            title,
            templateType: templateType || 'Personalizada',
            content: content || '',
            status: status || 'Draft'
        });
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_DOCUMENT', 'Document', doc._id.toString(), `Title: ${title}`);
        return res.status(201).json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createDocument = createDocument;
const getDocumentsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const docs = await models_1.Document.find({ project: projectId }).sort({ createdAt: -1 });
        return res.json(docs);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getDocumentsByProject = getDocumentsByProject;
const getDocumentById = async (req, res) => {
    try {
        const doc = await models_1.Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getDocumentById = getDocumentById;
const updateDocument = async (req, res) => {
    try {
        const doc = await models_1.Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para editar este documento.' });
        }
        Object.assign(doc, req.body);
        await doc.save();
        await (0, auditLogger_1.logAudit)(req, doc.project.toString(), 'UPDATE_DOCUMENT', 'Document', doc._id.toString(), `Title: ${doc.title}`);
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateDocument = updateDocument;
const deleteDocument = async (req, res) => {
    try {
        const doc = await models_1.Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del documento pueden eliminarlo.' });
        }
        await models_1.Document.findByIdAndDelete(req.params.id);
        await (0, auditLogger_1.logAudit)(req, doc.project.toString(), 'DELETE_DOCUMENT', 'Document', doc._id.toString(), `Title: ${doc.title}`);
        return res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteDocument = deleteDocument;
const generateReportSectionAI = async (req, res) => {
    try {
        const { id } = req.params;
        const { prompt, useRag } = req.body;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para ejecutar la generación de este documento.' });
        }
        const project = await models_1.Project.findById(doc.project);
        const projectContext = project ? {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            restrictions: project.restrictions,
            companyName: project.companyName
        } : {};
        // Retrieve Context Chunks (RAG) using Mongo Text Index Search if requested
        let ragContext = '';
        let citations = [];
        if (useRag) {
            const searchQuery = prompt || doc.title || project?.name || '';
            if (searchQuery.trim().length > 0) {
                // Query matching source documents (excluding guidelines to prevent template noise)
                const docs = await models_1.SourceDocument.find({ project: doc.project, documentType: { $ne: 'guideline' }, $text: { $search: searchQuery } }, { score: { $meta: 'textScore' } })
                    .sort({ score: { $meta: 'textScore' } })
                    .limit(3);
                if (docs && docs.length > 0) {
                    const contextParts = [];
                    docs.forEach(d => {
                        if (!citations.includes(d.filename)) {
                            citations.push(d.filename);
                        }
                        d.chunks.forEach(chunk => {
                            // Rough match check to prevent pushing irrelevant chunks
                            contextParts.push(`[Origen: ${d.filename}, Fragmento: ${chunk.index}] ${chunk.text}`);
                        });
                    });
                    ragContext = contextParts.slice(0, 5).join('\n\n');
                }
            }
        }
        let content = '';
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/generate-report-section`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    section_title: doc.title,
                    template_type: doc.templateType,
                    project_context: projectContext,
                    instruction: prompt || 'Generar la introducción de este capítulo basándose en el contexto del proyecto.',
                    rag_context: ragContext || undefined
                })
            });
            if (response.ok) {
                const data = await response.json();
                content = data.content;
                // Add footer references if RAG was utilized
                if (useRag && citations.length > 0) {
                    content += `\n\n---\n**Fuentes de consulta (RAG):**\n` + citations.map(c => `- *${c}*`).join('\n');
                }
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Error:', err);
            return res.status(502).json({ message: 'El servicio de IA para generación de informes no está disponible.' });
        }
        doc.content = content;
        await doc.save();
        await (0, auditLogger_1.logAudit)(req, doc.project.toString(), 'GENERATE_REPORT_AI', 'Document', doc._id.toString(), `Title: ${doc.title}, RAG: ${useRag ? 'Sí' : 'No'}`);
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.generateReportSectionAI = generateReportSectionAI;
