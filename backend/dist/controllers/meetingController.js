"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareMeetings = exports.publishMeeting = exports.convertDecision = exports.convertRequirement = exports.convertTask = exports.triggerAISummary = exports.deleteMeeting = exports.updateMeeting = exports.getMeetingById = exports.getMeetingsByProject = exports.createMeeting = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createMeeting = async (req, res) => {
    try {
        const { project, title, date, transcription, summary, agreements, tasks, risks, participants, rawTranscript, notes, agenda } = req.body;
        if (!project || !title) {
            return res.status(400).json({ message: 'Project and title are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create meetings' });
        }
        const meeting = await models_1.Meeting.create({
            project,
            owner: req.user._id,
            title,
            date: date || new Date(),
            transcription: transcription || rawTranscript || '',
            summary: summary || '',
            agreements: agreements || [],
            tasks: tasks || [],
            risks: risks || [],
            // New fields:
            participants: participants || [],
            rawTranscript: rawTranscript || transcription || '',
            notes: notes || '',
            agenda: agenda || '',
            status: 'Draft'
        });
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_MEETING', 'Meeting', meeting._id.toString(), `Title: ${title}`);
        return res.status(201).json(meeting);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createMeeting = createMeeting;
const getMeetingsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const meetings = await models_1.Meeting.find({ project: projectId }).populate('extractedActions.convertedTaskId').sort({ date: -1 });
        return res.json(meetings);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getMeetingsByProject = getMeetingsByProject;
const getMeetingById = async (req, res) => {
    try {
        const meeting = await models_1.Meeting.findById(req.params.id).populate('extractedActions.convertedTaskId');
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        return res.json(meeting);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getMeetingById = getMeetingById;
const updateMeeting = async (req, res) => {
    try {
        const meeting = await models_1.Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para editar esta minuta.' });
        }
        Object.assign(meeting, req.body);
        await meeting.save();
        const populated = await models_1.Meeting.findById(meeting._id).populate('extractedActions.convertedTaskId');
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'UPDATE_MEETING', 'Meeting', meeting._id.toString(), `Title: ${meeting.title}`);
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateMeeting = updateMeeting;
const deleteMeeting = async (req, res) => {
    try {
        const meeting = await models_1.Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador de la minuta pueden eliminarla.' });
        }
        await models_1.Meeting.findByIdAndDelete(req.params.id);
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'DELETE_MEETING', 'Meeting', meeting._id.toString(), `Title: ${meeting.title}`);
        return res.json({ message: 'Meeting deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteMeeting = deleteMeeting;
const triggerAISummary = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await models_1.Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        const isOwner = meeting.owner && meeting.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para ejecutar el resumen de esta minuta.' });
        }
        const textToAnalyze = meeting.rawTranscript || meeting.transcription || meeting.notes;
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            return res.status(400).json({ message: 'Transcription or notes text is required to generate summary' });
        }
        let aiResult;
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/summarize-meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transcription: textToAnalyze })
            });
            if (response.ok) {
                aiResult = await response.json();
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Error:', err);
            return res.status(502).json({ message: 'El servicio de IA para resúmenes de minutas no está disponible.' });
        }
        // Map response for backwards compatibility:
        meeting.aiSummary = aiResult.summary || '';
        meeting.summary = aiResult.summary || '';
        meeting.agreements = aiResult.topics || [];
        meeting.tasks = (aiResult.actions || []).map((a) => `${a.title} - ${a.ownerName || 'Sin definir'}`);
        meeting.risks = (aiResult.risks || []).map((r) => r.text);
        // Save structured suggestions:
        meeting.extractedActions = (aiResult.actions || []).map((a) => ({
            title: a.title,
            description: a.description || '',
            ownerName: a.ownerName || 'Sin definir',
            dueDate: a.dueDate ? new Date(a.dueDate) : null,
            priority: a.priority || 'Medium',
            confidence: a.confidence || 1.0,
            accepted: false,
            convertedTaskId: null
        }));
        meeting.extractedRequirements = (aiResult.requirements || []).map((r) => ({
            type: r.type === 'NonFunctional' ? 'NonFunctional' : 'Functional',
            text: r.text,
            confidence: r.confidence || 1.0,
            accepted: false,
            convertedRequirementId: null
        }));
        meeting.extractedDecisions = (aiResult.decisions || []).map((d) => ({
            text: d.text,
            accepted: false,
            convertedToADR: false,
            convertedADRId: null
        }));
        meeting.extractedRisks = (aiResult.risks || []).map((r) => ({
            text: r.text,
            severity: r.severity || 'Medium',
            accepted: false
        }));
        meeting.status = 'Analyzed';
        await meeting.save();
        const populated = await models_1.Meeting.findById(meeting._id).populate('extractedActions.convertedTaskId');
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'TRIGGER_MEETING_AI_SUMMARY', 'Meeting', meeting._id.toString(), `Title: ${meeting.title}`);
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.triggerAISummary = triggerAISummary;
const convertTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { actionIndex, assignedToUserId } = req.body;
        const meeting = await models_1.Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        if (role !== 'Admin' && role !== 'Editor' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only Admins or Editors can convert items' });
        }
        if (!meeting.extractedActions || !meeting.extractedActions[actionIndex]) {
            return res.status(400).json({ message: 'Action suggestion not found' });
        }
        const action = meeting.extractedActions[actionIndex];
        if (action.accepted) {
            return res.status(400).json({ message: 'Esta acción ya fue convertida a tarea.' });
        }
        // Create Task
        const task = await models_1.Task.create({
            project: meeting.project,
            owner: req.user._id,
            title: action.title,
            description: action.description || '',
            assignedTo: assignedToUserId || null,
            status: 'Todo',
            dueDate: action.dueDate || null,
            sprint: 'General'
        });
        // Create TraceLink
        await models_1.TraceLink.create({
            project: meeting.project,
            sourceType: 'Meeting',
            sourceId: meeting._id,
            targetType: 'Task',
            targetId: task._id,
            linkType: 'extracted_from',
            createdBy: req.user._id
        });
        // Update meeting action state
        action.accepted = true;
        action.convertedTaskId = task._id;
        meeting.markModified('extractedActions');
        await meeting.save();
        const populated = await models_1.Meeting.findById(meeting._id).populate('extractedActions.convertedTaskId');
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'CONVERT_MEETING_TASK', 'Meeting', meeting._id.toString(), `Converted task: ${task.title}`);
        return res.json({ meeting: populated, task });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.convertTask = convertTask;
const convertRequirement = async (req, res) => {
    try {
        const { id } = req.params;
        const { requirementIndex, code, priority } = req.body;
        const meeting = await models_1.Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        if (role !== 'Admin' && role !== 'Editor' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only Admins or Editors can convert items' });
        }
        if (!meeting.extractedRequirements || !meeting.extractedRequirements[requirementIndex]) {
            return res.status(400).json({ message: 'Requirement suggestion not found' });
        }
        const reqSug = meeting.extractedRequirements[requirementIndex];
        if (reqSug.accepted) {
            return res.status(400).json({ message: 'Este requerimiento ya fue convertido.' });
        }
        if (!code) {
            return res.status(400).json({ message: 'El código del requerimiento (RF-xx / RN-xx) es obligatorio.' });
        }
        const existingReq = await models_1.Requirement.findOne({ project: meeting.project, code });
        if (existingReq) {
            return res.status(400).json({ message: `El código ${code} ya está en uso en este proyecto.` });
        }
        // Create Requirement
        const requirement = await models_1.Requirement.create({
            project: meeting.project,
            owner: req.user._id,
            code,
            title: reqSug.text.split('\n')[0].slice(0, 80),
            description: reqSug.text,
            type: reqSug.type === 'NonFunctional' ? 'Non-Functional' : 'Functional',
            priority: priority || 'Medium',
            status: 'Draft',
            source: `Minuta: ${meeting.title}`
        });
        // Create TraceLink
        await models_1.TraceLink.create({
            project: meeting.project,
            sourceType: 'Meeting',
            sourceId: meeting._id,
            targetType: 'Requirement',
            targetId: requirement._id,
            linkType: 'extracted_from',
            createdBy: req.user._id
        });
        // Update meeting requirement state
        reqSug.accepted = true;
        reqSug.convertedRequirementId = requirement._id;
        meeting.markModified('extractedRequirements');
        await meeting.save();
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'CONVERT_MEETING_REQUIREMENT', 'Meeting', meeting._id.toString(), `Converted requirement: ${requirement.code}`);
        return res.json({ meeting, requirement });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.convertRequirement = convertRequirement;
const convertDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const { decisionIndex, code } = req.body;
        const meeting = await models_1.Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        if (role !== 'Admin' && role !== 'Editor' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only Admins or Editors can convert items' });
        }
        if (!meeting.extractedDecisions || !meeting.extractedDecisions[decisionIndex]) {
            return res.status(400).json({ message: 'Decision suggestion not found' });
        }
        const decSug = meeting.extractedDecisions[decisionIndex];
        if (decSug.accepted) {
            return res.status(400).json({ message: 'Esta decisión ya fue convertida.' });
        }
        if (!code) {
            return res.status(400).json({ message: 'El código del ADR (ADR-xx) es obligatorio.' });
        }
        const existingADR = await models_1.ADRDecision.findOne({ project: meeting.project, code });
        if (existingADR) {
            return res.status(400).json({ message: `El código ${code} ya está en uso en este proyecto.` });
        }
        // Create ADRDecision
        const adr = await models_1.ADRDecision.create({
            project: meeting.project,
            owner: req.user._id,
            code,
            title: decSug.text.slice(0, 80),
            status: 'Draft',
            context: `Acordado en la reunión "${meeting.title}" el ${new Date(meeting.date).toLocaleDateString('es-ES')}.`,
            decision: decSug.text,
            consequences: 'Por definir.',
            version: 1,
            requiredApprovals: 2,
            currentApprovals: 0
        });
        // Create TraceLink
        await models_1.TraceLink.create({
            project: meeting.project,
            sourceType: 'Meeting',
            sourceId: meeting._id,
            targetType: 'ADRDecision',
            targetId: adr._id,
            linkType: 'extracted_from',
            createdBy: req.user._id
        });
        // Update meeting decision state
        decSug.accepted = true;
        decSug.convertedToADR = true;
        decSug.convertedADRId = adr._id;
        meeting.markModified('extractedDecisions');
        await meeting.save();
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'CONVERT_MEETING_DECISION', 'Meeting', meeting._id.toString(), `Converted decision to ADR: ${adr.code}`);
        return res.json({ meeting, adr });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.convertDecision = convertDecision;
const publishMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await models_1.Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, meeting.project.toString());
        if (role !== 'Admin' && role !== 'Editor' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only Admins or Editors can publish meetings' });
        }
        meeting.status = 'Published';
        await meeting.save();
        const populated = await models_1.Meeting.findById(meeting._id).populate('extractedActions.convertedTaskId');
        await (0, auditLogger_1.logAudit)(req, meeting.project.toString(), 'PUBLISH_MEETING', 'Meeting', meeting._id.toString(), `Published meeting minuta: ${meeting.title}`);
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.publishMeeting = publishMeeting;
const compareMeetings = async (req, res) => {
    try {
        const { id } = req.params;
        const { compareWithId } = req.body;
        if (!compareWithId) {
            return res.status(400).json({ message: 'Debe especificar el ID de la reunión con la que desea comparar.' });
        }
        const meetingCurr = await models_1.Meeting.findById(id);
        const meetingPrev = await models_1.Meeting.findById(compareWithId);
        if (!meetingCurr || !meetingPrev) {
            return res.status(404).json({ message: 'Una o ambas reuniones no fueron encontradas.' });
        }
        const response = await fetch(`${AI_SERVICE_URL}/ai/compare-meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prev_title: meetingPrev.title,
                prev_summary: meetingPrev.summary || '',
                prev_transcription: meetingPrev.rawTranscript || meetingPrev.transcription || '',
                curr_title: meetingCurr.title,
                curr_summary: meetingCurr.summary || '',
                curr_transcription: meetingCurr.rawTranscript || meetingCurr.transcription || ''
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
exports.compareMeetings = compareMeetings;
