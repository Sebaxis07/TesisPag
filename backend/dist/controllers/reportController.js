"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateReportRubric = exports.critiqueReportSection = exports.checkReportConsistency = exports.exportDocumentDOCX = exports.exportDocumentPDF = exports.citeSource = exports.bindParagraphEvidence = exports.commitDocumentVersion = exports.getInlineSuggestionAI = exports.autocompleteReportSectionAI = exports.generateReportSectionAI = exports.deleteDocument = exports.updateDocument = exports.getDocumentById = exports.getDocumentsByProject = exports.createDocument = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const pdfkit_1 = __importDefault(require("pdfkit"));
const docx_1 = require("docx");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createDocument = async (req, res) => {
    try {
        const { project, title, templateType, content, status, level, parentSection, order, assignedTo } = req.body;
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
            status: status || 'Draft',
            level: level || 1,
            parentSection: parentSection || null,
            order: order || 0,
            assignedTo: assignedTo || null
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
        // Sort by level and order to maintain the tree hierarchy sequence
        const docs = await models_1.Document.find({ project: projectId }).sort({ level: 1, order: 1, createdAt: 1 });
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
        // LOCK CHECK: If document is Approved or Frozen, block edits to content.
        if ((doc.status === 'Approved' || doc.status === 'Frozen') && req.body.content !== undefined && req.body.content !== doc.content) {
            return res.status(403).json({ message: 'Este documento está aprobado o congelado y no se puede modificar. Crea una nueva versión para realizar cambios.' });
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
        // LOCK CHECK
        if (doc.status === 'Approved' || doc.status === 'Frozen') {
            return res.status(403).json({ message: 'Este documento está aprobado o congelado y no se puede modificar.' });
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
const autocompleteReportSectionAI = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentContent, instruction } = req.body;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para ejecutar el autocompletado en este documento.' });
        }
        // LOCK CHECK
        if (doc.status === 'Approved' || doc.status === 'Frozen') {
            return res.status(403).json({ message: 'Este documento está aprobado o congelado y no se puede modificar.' });
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
        let completion = '';
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/autocomplete-report-section`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_content: currentContent || '',
                    section_title: doc.title,
                    template_type: doc.templateType,
                    project_context: projectContext,
                    instruction: instruction || undefined
                })
            });
            if (response.ok) {
                const data = await response.json();
                completion = data.completion;
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Autocomplete Error:', err);
            return res.status(502).json({ message: 'El servicio de IA para autocompletado de informes no está disponible.' });
        }
        await (0, auditLogger_1.logAudit)(req, doc.project.toString(), 'AUTOCOMPLETE_REPORT_AI', 'Document', doc._id.toString(), `Title: ${doc.title}`);
        return res.json({ completion });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.autocompleteReportSectionAI = autocompleteReportSectionAI;
const getInlineSuggestionAI = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentContent } = req.body;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para consultar sugerencias en este documento.' });
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
        const truncatedText = (currentContent || '').slice(-1000);
        let suggestion = '';
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/inline-suggest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_text: truncatedText,
                    section_title: doc.title,
                    template_type: doc.templateType,
                    project_context: projectContext
                })
            });
            if (response.ok) {
                const data = await response.json();
                suggestion = data.suggestion;
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Inline Suggestion Error:', err);
            return res.status(502).json({ message: 'El servicio de IA para sugerencias no está disponible.' });
        }
        return res.json({ suggestion });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getInlineSuggestionAI = getInlineSuggestionAI;
// ----------------------------------------------------
// NEW ENDPOINTS FOR ADVANCED ACADEMIC WORKSPACE
// ----------------------------------------------------
const commitDocumentVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const { commitMessage } = req.body;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para realizar commits.' });
        }
        const nextVerNum = (doc.versions?.length || 0) + 1;
        doc.versions.push({
            versionNumber: nextVerNum,
            content: doc.content,
            commitMessage: commitMessage || `Checkpoint de versión ${nextVerNum}`,
            updatedBy: req.user._id,
            createdAt: new Date()
        });
        // Unfreeze on new version commit so it becomes editable as Draft again
        if (doc.status === 'Approved' || doc.status === 'Frozen') {
            doc.status = 'Draft';
        }
        await doc.save();
        await (0, auditLogger_1.logAudit)(req, doc.project.toString(), 'COMMIT_DOCUMENT_VERSION', 'Document', doc._id.toString(), `Version: ${nextVerNum}, Msg: ${commitMessage}`);
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.commitDocumentVersion = commitDocumentVersion;
const bindParagraphEvidence = async (req, res) => {
    try {
        const { id } = req.params;
        const { paragraphId, sourceType, sourceId, matchedText, confidence } = req.body;
        if (!paragraphId || !sourceType || !sourceId) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        if (doc.status === 'Approved' || doc.status === 'Frozen') {
            return res.status(403).json({ message: 'El documento está bloqueado y no se le puede asociar evidencia.' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este documento.' });
        }
        const existingIndex = doc.evidence.findIndex(e => e.paragraphId === paragraphId && e.sourceId.toString() === sourceId.toString());
        if (existingIndex > -1) {
            doc.evidence[existingIndex].matchedText = matchedText || '';
            doc.evidence[existingIndex].confidence = confidence || 1.0;
        }
        else {
            doc.evidence.push({
                paragraphId,
                sourceType,
                sourceId,
                matchedText: matchedText || '',
                confidence: confidence || 1.0
            });
        }
        await doc.save();
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.bindParagraphEvidence = bindParagraphEvidence;
const citeSource = async (req, res) => {
    try {
        const { id } = req.params;
        const { sourceType, sourceId, bibtexData, citationString, citationKey } = req.body;
        if (!sourceType || !citationString) {
            return res.status(400).json({ message: 'sourceType and citationString are required' });
        }
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        if (doc.status === 'Approved' || doc.status === 'Frozen') {
            return res.status(403).json({ message: 'El documento está bloqueado y no se le pueden agregar citas.' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, doc.project.toString());
        const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este documento.' });
        }
        const key = citationKey || `[APA-${(doc.citations?.length || 0) + 1}]`;
        doc.citations.push({
            citationKey: key,
            sourceType,
            sourceId: sourceId || undefined,
            bibtexData: bibtexData || '',
            citationString
        });
        await doc.save();
        return res.json(doc);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.citeSource = citeSource;
const exportDocumentPDF = async (req, res) => {
    try {
        const doc = await models_1.Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const pdf = new pdfkit_1.default({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/\s+/g, '_')}.pdf"`);
        pdf.pipe(res);
        // Title Page / Header
        pdf.fontSize(24).font('Helvetica-Bold').text(doc.title, { align: 'center' });
        pdf.moveDown();
        pdf.fontSize(10).font('Helvetica-Oblique').text(`Documento Académico - ThesisFlow`, { align: 'center' });
        pdf.text(`Tipo de Plantilla: ${doc.templateType}`, { align: 'center' });
        pdf.text(`Estado: ${doc.status} | Versión: ${doc.versions?.length || 1}`, { align: 'center' });
        pdf.moveDown(2);
        // Parse Markdown roughly
        const lines = doc.content.split('\n');
        lines.forEach(line => {
            if (line.startsWith('# ')) {
                pdf.moveDown();
                pdf.fontSize(18).font('Helvetica-Bold').text(line.replace('# ', ''));
                pdf.moveDown(0.5);
            }
            else if (line.startsWith('## ')) {
                pdf.moveDown();
                pdf.fontSize(14).font('Helvetica-Bold').text(line.replace('## ', ''));
                pdf.moveDown(0.5);
            }
            else if (line.startsWith('### ')) {
                pdf.moveDown();
                pdf.fontSize(12).font('Helvetica-Bold').text(line.replace('### ', ''));
                pdf.moveDown(0.5);
            }
            else if (line.startsWith('- ') || line.startsWith('* ')) {
                pdf.fontSize(11).font('Helvetica').text(`  • ${line.substring(2)}`);
            }
            else if (line.trim()) {
                pdf.fontSize(11).font('Helvetica').text(line, { align: 'justify', paragraphGap: 8 });
            }
            else {
                pdf.moveDown(0.2);
            }
        });
        // Add APA 7 Citations if present
        if (doc.citations && doc.citations.length > 0) {
            pdf.addPage();
            pdf.fontSize(16).font('Helvetica-Bold').text('Referencias (APA 7)', { align: 'left' });
            pdf.moveDown();
            doc.citations.forEach(c => {
                pdf.fontSize(10).font('Helvetica').text(`${c.citationKey} ${c.citationString}`, { paragraphGap: 6 });
            });
        }
        pdf.end();
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.exportDocumentPDF = exportDocumentPDF;
const exportDocumentDOCX = async (req, res) => {
    try {
        const doc = await models_1.Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const paragraphs = [];
        // Title
        paragraphs.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: doc.title, bold: true, size: 32 })
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 200 }
        }));
        // Subtitle info
        paragraphs.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: `Tipo de Plantilla: ${doc.templateType} | Estado: ${doc.status}\n\n`, italics: true, size: 20 })
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 400 }
        }));
        // Content
        const lines = doc.content.split('\n');
        lines.forEach(line => {
            if (line.startsWith('# ')) {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: line.replace('# ', ''), bold: true, size: 28 })
                    ],
                    spacing: { before: 200, after: 100 }
                }));
            }
            else if (line.startsWith('## ')) {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: line.replace('## ', ''), bold: true, size: 24 })
                    ],
                    spacing: { before: 180, after: 80 }
                }));
            }
            else if (line.startsWith('### ')) {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: line.replace('### ', ''), bold: true, size: 20 })
                    ],
                    spacing: { before: 140, after: 60 }
                }));
            }
            else if (line.startsWith('- ') || line.startsWith('* ')) {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: `• ${line.substring(2)}`, size: 22 })
                    ],
                    spacing: { after: 100 }
                }));
            }
            else if (line.trim()) {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: line, size: 22 })
                    ],
                    spacing: { after: 160 }
                }));
            }
        });
        // Citations
        if (doc.citations && doc.citations.length > 0) {
            paragraphs.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({ text: 'Referencias (APA 7)', bold: true, size: 24 })
                ],
                spacing: { before: 300, after: 150 }
            }));
            doc.citations.forEach(c => {
                paragraphs.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: `${c.citationKey} ${c.citationString}`, size: 20 })
                    ],
                    spacing: { after: 100 }
                }));
            });
        }
        const docxFile = new docx_1.Document({
            sections: [{
                    properties: {},
                    children: paragraphs
                }]
        });
        const buffer = await docx_1.Packer.toBuffer(docxFile);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/\s+/g, '_')}.docx"`);
        return res.send(buffer);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.exportDocumentDOCX = exportDocumentDOCX;
const checkReportConsistency = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const project = await models_1.Project.findById(doc.project);
        const projectContext = project ? {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            restrictions: project.restrictions,
            methodology: project.methodology,
            companyName: project.companyName
        } : {};
        const response = await fetch(`${AI_SERVICE_URL}/ai/check-consistency`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: doc.content || '',
                section_title: doc.title,
                template_type: doc.templateType,
                project_context: projectContext
            })
        });
        if (!response.ok) {
            throw new Error(`AI Service returned code ${response.status}`);
        }
        const aiResult = await response.json();
        return res.json(aiResult);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.checkReportConsistency = checkReportConsistency;
const critiqueReportSection = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const project = await models_1.Project.findById(doc.project);
        const projectContext = project ? {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            restrictions: project.restrictions,
            methodology: project.methodology,
            companyName: project.companyName
        } : {};
        const response = await fetch(`${AI_SERVICE_URL}/ai/critique-section`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: doc.content || '',
                section_title: doc.title,
                template_type: doc.templateType,
                project_context: projectContext
            })
        });
        if (!response.ok) {
            throw new Error(`AI Service returned code ${response.status}`);
        }
        const aiResult = await response.json();
        return res.json(aiResult);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.critiqueReportSection = critiqueReportSection;
const evaluateReportRubric = async (req, res) => {
    try {
        const { id } = req.params;
        const { rubricText } = req.body;
        if (!rubricText || rubricText.trim().length === 0) {
            return res.status(400).json({ message: 'El texto de la rúbrica es requerido para evaluar.' });
        }
        const doc = await models_1.Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const project = await models_1.Project.findById(doc.project);
        const projectContext = project ? {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            restrictions: project.restrictions,
            methodology: project.methodology,
            companyName: project.companyName
        } : {};
        const response = await fetch(`${AI_SERVICE_URL}/ai/check-rubric`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: doc.content || '',
                section_title: doc.title,
                rubric_text: rubricText,
                project_context: projectContext
            })
        });
        if (!response.ok) {
            throw new Error(`AI Service returned code ${response.status}`);
        }
        const aiResult = await response.json();
        return res.json(aiResult);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.evaluateReportRubric = evaluateReportRubric;
