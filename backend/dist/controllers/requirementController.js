"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequirementsBulk = exports.extractRequirementsFromText = exports.deleteRequirement = exports.updateRequirement = exports.getRequirementById = exports.getRequirementsByProject = exports.createRequirement = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const requirementStatusHelper_1 = require("../utils/requirementStatusHelper");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createRequirement = async (req, res) => {
    try {
        const { project, code, title, description, type, priority, status, source, methodologyTypeSnapshot, workflowStatus, sprintRef, phaseRef, iterationRef, prototypeVersionRef, sourceType, sourceRef, approvalStatus } = req.body;
        if (!project || !code || !title || !type) {
            return res.status(400).json({ message: 'Project, code, title, and type are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create requirements' });
        }
        // Resolve project methodology for the snapshot
        let finalMethodology = methodologyTypeSnapshot;
        if (!finalMethodology) {
            const proj = await models_1.Project.findById(project);
            if (proj) {
                finalMethodology = proj.methodology;
            }
        }
        const requirement = await models_1.Requirement.create({
            project,
            owner: req.user._id,
            code,
            title,
            description: description || '',
            type,
            priority: priority || 'Medium',
            status: status || 'Draft',
            source: source || 'Manual',
            methodologyTypeSnapshot: finalMethodology || 'scrum',
            workflowStatus: workflowStatus || 'Backlog',
            sprintRef: sprintRef || '',
            phaseRef: phaseRef || '',
            iterationRef: iterationRef || '',
            prototypeVersionRef: prototypeVersionRef || '',
            linkedTasks: [],
            linkedMeetings: [],
            linkedADRs: [],
            linkedDeliverables: [],
            linkedTests: [],
            version: 1,
            sourceType: sourceType || 'manual',
            sourceRef: sourceRef || null,
            approvalStatus: approvalStatus || 'Draft'
        });
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_REQUIREMENT', 'Requirement', requirement._id.toString(), `Code: ${code}, Title: ${title}`);
        return res.status(201).json(requirement);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createRequirement = createRequirement;
const getRequirementsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (!role) {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const requirements = await models_1.Requirement.find({ project: projectId })
            .populate('linkedTasks')
            .populate('linkedMeetings')
            .populate('linkedADRs')
            .populate('linkedDeliverables')
            .sort({ code: 1 });
        return res.json(requirements);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getRequirementsByProject = getRequirementsByProject;
const getRequirementById = async (req, res) => {
    try {
        const requirement = await models_1.Requirement.findById(req.params.id)
            .populate('linkedTasks')
            .populate('linkedMeetings')
            .populate('linkedADRs')
            .populate('linkedDeliverables');
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, requirement.project.toString());
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        return res.json(requirement);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getRequirementById = getRequirementById;
const updateRequirement = async (req, res) => {
    try {
        const requirement = await models_1.Requirement.findById(req.params.id);
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, requirement.project.toString());
        const isOwner = requirement.owner && requirement.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        const isEditor = role === 'Editor';
        // Policy: Editor/Admin or Owner can edit.
        if (!isAdmin && !isEditor && !isOwner) {
            return res.status(403).json({ message: 'No tienes permisos para editar este requerimiento.' });
        }
        Object.assign(requirement, req.body);
        await requirement.save();
        // Recalculate status (e.g. if linkedTests changed)
        await (0, requirementStatusHelper_1.recalculateRequirementStatus)(requirement._id.toString());
        await (0, auditLogger_1.logAudit)(req, requirement.project.toString(), 'UPDATE_REQUIREMENT', 'Requirement', requirement._id.toString(), `Code: ${requirement.code}, Title: ${requirement.title}`);
        // Fetch populated version to return
        const populated = await models_1.Requirement.findById(requirement._id)
            .populate('linkedTasks')
            .populate('linkedMeetings')
            .populate('linkedADRs')
            .populate('linkedDeliverables');
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateRequirement = updateRequirement;
const deleteRequirement = async (req, res) => {
    try {
        const requirement = await models_1.Requirement.findById(req.params.id);
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, requirement.project.toString());
        const isOwner = requirement.owner && requirement.owner.toString() === req.user._id.toString();
        const isAdmin = role === 'Admin' || req.user.role === 'Admin';
        // Policy: Only Project Admin or the Owner can delete.
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del requerimiento pueden eliminarlo.' });
        }
        await models_1.Requirement.findByIdAndDelete(req.params.id);
        await (0, auditLogger_1.logAudit)(req, requirement.project.toString(), 'DELETE_REQUIREMENT', 'Requirement', requirement._id.toString(), `Code: ${requirement.code}, Title: ${requirement.title}`);
        return res.json({ message: 'Requirement deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteRequirement = deleteRequirement;
const extractRequirementsFromText = async (req, res) => {
    try {
        const { projectId, text } = req.body;
        if (!projectId || !text) {
            return res.status(400).json({ message: 'Project ID and text are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, projectId));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can extract requirements' });
        }
        let aiRequirements = [];
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/extract-requirements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            if (response.ok) {
                const data = await response.json();
                aiRequirements = data.requirements;
            }
            else {
                throw new Error(`AI Service returned code ${response.status}`);
            }
        }
        catch (err) {
            console.error('AI Service Error:', err);
            return res.status(502).json({ message: 'El servicio de extracción de requerimientos con IA no está disponible.' });
        }
        await (0, auditLogger_1.logAudit)(req, projectId, 'SUGGEST_REQUIREMENTS_AI', 'Requirement', 'Multiple', `Requested AI requirement suggestions. Received ${aiRequirements.length} suggestions`);
        return res.json(aiRequirements);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.extractRequirementsFromText = extractRequirementsFromText;
const createRequirementsBulk = async (req, res) => {
    try {
        const { project, requirements } = req.body;
        if (!project || !Array.isArray(requirements)) {
            return res.status(400).json({ message: 'Project and requirements array are required' });
        }
        // Role check (Admin or Editor)
        const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await (0, auth_1.getProjectRole)(req.user._id, project));
        if (role !== 'Admin' && role !== 'Editor') {
            return res.status(403).json({ message: 'Only Admins or Editors can create requirements' });
        }
        const proj = await models_1.Project.findById(project);
        const finalMethodology = proj ? proj.methodology : 'scrum';
        const savedRequirements = [];
        for (const reqObj of requirements) {
            let existingReq = await models_1.Requirement.findOne({ project, code: reqObj.code });
            if (existingReq) {
                existingReq.title = reqObj.title;
                existingReq.description = reqObj.description;
                existingReq.type = reqObj.type;
                existingReq.priority = reqObj.priority || 'Medium';
                existingReq.source = reqObj.source || 'Extracción IA';
                if (!existingReq.methodologyTypeSnapshot) {
                    existingReq.methodologyTypeSnapshot = finalMethodology;
                }
                await existingReq.save();
                savedRequirements.push(existingReq);
            }
            else {
                const newReq = await models_1.Requirement.create({
                    project,
                    owner: req.user._id,
                    code: reqObj.code,
                    title: reqObj.title,
                    description: reqObj.description,
                    type: reqObj.type,
                    priority: reqObj.priority || 'Medium',
                    status: 'Draft',
                    source: reqObj.source || 'Extracción IA',
                    methodologyTypeSnapshot: finalMethodology,
                    workflowStatus: 'Backlog',
                    sprintRef: '',
                    phaseRef: '',
                    iterationRef: '',
                    prototypeVersionRef: '',
                    linkedTasks: [],
                    linkedMeetings: [],
                    linkedADRs: [],
                    linkedDeliverables: [],
                    linkedTests: [],
                    version: 1,
                    sourceType: reqObj.sourceType || 'rag',
                    sourceRef: reqObj.sourceRef || null,
                    approvalStatus: 'Draft'
                });
                savedRequirements.push(newReq);
            }
        }
        await (0, auditLogger_1.logAudit)(req, project, 'CREATE_REQUIREMENTS_BULK', 'Requirement', 'Multiple', `Created/Updated ${savedRequirements.length} requirements from AI suggestions`);
        return res.status(201).json(savedRequirements);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createRequirementsBulk = createRequirementsBulk;
