"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdvisorDashboardSummary = exports.loadTestProject = exports.deleteProject = exports.generatePresentationDefense = exports.compareProjectStacks = exports.updateTeamMember = exports.removeTeamMember = exports.getTeamMembers = exports.addTeamMember = exports.updateProject = exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../utils/auditLogger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const createProject = async (req, res) => {
    try {
        const { name, description, problem, objectives, restrictions, companyName, companyContact, methodology } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }
        const project = await models_1.Project.create({
            name,
            description: description || '',
            problem: problem || '',
            objectives: objectives || '',
            restrictions: restrictions || '',
            companyName: companyName || '',
            companyContact: companyContact || '',
            methodology: methodology || 'Scrum'
        });
        // Create standard TeamMember entry for creator as Admin
        await models_1.TeamMember.create({
            user: req.user._id,
            project: project._id,
            role: 'Admin',
            operationalRole: 'Líder Técnico',
            workload: 100
        });
        // Add to user's assigned projects
        await models_1.User.findByIdAndUpdate(req.user._id, {
            $push: { assignedProjects: project._id }
        });
        await (0, auditLogger_1.logAudit)(req, project._id.toString(), 'CREATE_PROJECT', 'Project', project._id.toString(), `Name: ${name}`);
        return res.status(201).json(project);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createProject = createProject;
const getProjects = async (req, res) => {
    try {
        let projects;
        if (req.user.role === 'Admin') {
            projects = await models_1.Project.find({});
        }
        else {
            const memberships = await models_1.TeamMember.find({ user: req.user._id });
            const projectIds = memberships.map(m => m.project);
            projects = await models_1.Project.find({ _id: { $in: projectIds } });
        }
        return res.json(projects);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getProjects = getProjects;
const getProjectById = async (req, res) => {
    try {
        const role = await (0, auth_1.getProjectRole)(req.user._id, req.params.id);
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const project = await models_1.Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.json(project);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getProjectById = getProjectById;
const updateProject = async (req, res) => {
    try {
        const role = await (0, auth_1.getProjectRole)(req.user._id, req.params.id);
        if (role !== 'Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only project Admins can update the project metadata.' });
        }
        const project = await models_1.Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        await (0, auditLogger_1.logAudit)(req, project._id.toString(), 'UPDATE_PROJECT', 'Project', project._id.toString(), `Updated metadata for project: ${project.name}`);
        return res.json(project);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateProject = updateProject;
const addTeamMember = async (req, res) => {
    try {
        const { userId, role, operationalRole, workload } = req.body;
        const projectId = req.params.projectId;
        if (!userId || !role) {
            return res.status(400).json({ message: 'User ID and project role are required' });
        }
        const currentRole = await (0, auth_1.getProjectRole)(req.user._id, projectId);
        if (currentRole !== 'Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only project Admins can add members.' });
        }
        // Check if membership already exists
        const existing = await models_1.TeamMember.findOne({ user: userId, project: projectId });
        if (existing) {
            return res.status(400).json({ message: 'User is already a member of this project' });
        }
        const member = await models_1.TeamMember.create({
            user: userId,
            project: projectId,
            role,
            operationalRole: operationalRole || 'Full Stack Developer',
            workload: workload || 0
        });
        // Add project ID to user's assignedProjects
        await models_1.User.findByIdAndUpdate(userId, {
            $addToSet: { assignedProjects: projectId }
        });
        const populatedMember = await member.populate('user', 'name rut role');
        await (0, auditLogger_1.logAudit)(req, projectId, 'ADD_PROJECT_MEMBER', 'TeamMember', member._id.toString(), `Added user ${userId} as ${role} (${operationalRole})`);
        return res.status(201).json(populatedMember);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.addTeamMember = addTeamMember;
const getTeamMembers = async (req, res) => {
    try {
        const role = await (0, auth_1.getProjectRole)(req.user._id, req.params.projectId);
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const members = await models_1.TeamMember.find({ project: req.params.projectId })
            .populate('user', 'name rut role');
        return res.json(members);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getTeamMembers = getTeamMembers;
const removeTeamMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const member = await models_1.TeamMember.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Team member entry not found' });
        }
        const currentRole = await (0, auth_1.getProjectRole)(req.user._id, member.project.toString());
        if (currentRole !== 'Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only project Admins can remove members.' });
        }
        await models_1.User.findByIdAndUpdate(member.user, {
            $pull: { assignedProjects: member.project }
        });
        await models_1.TeamMember.findByIdAndDelete(memberId);
        await (0, auditLogger_1.logAudit)(req, member.project.toString(), 'REMOVE_PROJECT_MEMBER', 'TeamMember', memberId, `Removed user ID: ${member.user}`);
        return res.json({ message: 'Team member removed from project successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.removeTeamMember = removeTeamMember;
const updateTeamMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { role, operationalRole, workload } = req.body;
        const member = await models_1.TeamMember.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Miembro no encontrado.' });
        }
        const currentRole = await (0, auth_1.getProjectRole)(req.user._id, member.project.toString());
        if (currentRole !== 'Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Solo los Admins del proyecto pueden editar miembros.' });
        }
        if (role)
            member.role = role;
        if (operationalRole !== undefined)
            member.operationalRole = operationalRole;
        if (workload !== undefined)
            member.workload = workload;
        await member.save();
        const populated = await member.populate('user', 'name rut role');
        await (0, auditLogger_1.logAudit)(req, member.project.toString(), 'UPDATE_PROJECT_MEMBER', 'TeamMember', memberId, `Updated member ${memberId}: role=${role}, operationalRole=${operationalRole}, workload=${workload}`);
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateTeamMember = updateTeamMember;
const compareProjectStacks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { options, criterias } = req.body;
        if (!options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ message: 'Must supply at least two technology options for comparison.' });
        }
        const defaultCriterias = ['Costo', 'Escalabilidad', 'Velocidad de Desarrollo', 'Curva de Aprendizaje', 'Seguridad'];
        const activeCriterias = criterias && Array.isArray(criterias) && criterias.length > 0 ? criterias : defaultCriterias;
        const project = await models_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, projectId);
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        const projectContext = {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            restrictions: project.restrictions
        };
        let aiResult;
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/compare-stacks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    options,
                    criterias: activeCriterias,
                    project_context: projectContext
                })
            });
            if (response.ok) {
                aiResult = await response.json();
            }
            else {
                const errText = await response.text();
                throw new Error(`AI Service returned code ${response.status}: ${errText}`);
            }
        }
        catch (err) {
            console.error('AI Stack Compare Error:', err);
            return res.status(502).json({ message: `El servicio de comparación de stacks con IA no está disponible: ${err.message}` });
        }
        await (0, auditLogger_1.logAudit)(req, projectId, 'COMPARE_STACKS_AI', 'Project', projectId, `Compared: ${options.join(' vs ')}`);
        return res.json(aiResult);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.compareProjectStacks = compareProjectStacks;
const generatePresentationDefense = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await models_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        const role = await (0, auth_1.getProjectRole)(req.user._id, projectId);
        if (!role && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
        }
        // 1. Fetch requirements
        const requirements = await models_1.Requirement.find({ project: projectId });
        // 2. Fetch report sections and concatenate their content summaries
        const docs = await models_1.Document.find({ project: projectId });
        const chaptersSummary = docs
            .map(d => `Capítulo: ${d.title}\nContenido (Resumen): ${d.content ? d.content.substring(0, 500) + '...' : 'Vacío'}`)
            .join('\n\n');
        const projectContext = {
            name: project.name,
            description: project.description,
            problem: project.problem,
            objectives: project.objectives,
            companyName: project.companyName
        };
        let aiResult;
        try {
            const response = await fetch(`${AI_SERVICE_URL}/ai/presentation-helper`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project_context: projectContext,
                    requirements: requirements.map(r => ({ code: r.code, title: r.title, type: r.type })),
                    chapters_summary: chaptersSummary || 'No hay capítulos redactados aún en la plataforma.'
                })
            });
            if (response.ok) {
                aiResult = await response.json();
            }
            else {
                const errText = await response.text();
                throw new Error(`AI Service returned code ${response.status}: ${errText}`);
            }
        }
        catch (err) {
            console.error('AI Presentation Assistant Error:', err);
            return res.status(502).json({ message: `El servicio de Inteligencia Artificial no está disponible: ${err.message}` });
        }
        await (0, auditLogger_1.logAudit)(req, projectId, 'GENERATE_DEFENSE_PLAN_AI', 'Project', projectId, `Generated presentation defense guide with IA.`);
        return res.json(aiResult);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.generatePresentationDefense = generatePresentationDefense;
const deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await models_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Authorization: Only system Admin or project Admin can delete
        const role = await (0, auth_1.getProjectRole)(req.user._id, projectId);
        if (role !== 'Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only project Admins or system Admins can delete the project.' });
        }
        // Delete related ADRReviews first (they don't reference project directly but reference ADRDecisions)
        const adrs = await models_1.ADRDecision.find({ project: projectId }, '_id');
        const adrIds = adrs.map(a => a._id);
        if (adrIds.length > 0) {
            await models_1.ADRReview.deleteMany({ adr: { $in: adrIds } });
        }
        // Delete all cascading resources
        await models_1.TeamMember.deleteMany({ project: projectId });
        await models_1.Requirement.deleteMany({ project: projectId });
        await models_1.Meeting.deleteMany({ project: projectId });
        await models_1.ADRDecision.deleteMany({ project: projectId });
        await models_1.Notification.deleteMany({ project: projectId });
        await models_1.Diagram.deleteMany({ project: projectId });
        await models_1.Task.deleteMany({ project: projectId });
        await models_1.Document.deleteMany({ project: projectId });
        await models_1.TraceLink.deleteMany({ project: projectId });
        await models_1.SourceDocument.deleteMany({ project: projectId });
        await models_1.AuditLog.deleteMany({ project: projectId });
        await models_1.ProjectInvite.deleteMany({ project: projectId });
        await models_1.PresenceSession.deleteMany({ project: projectId });
        await models_1.Comment.deleteMany({ project: projectId });
        await models_1.Deliverable.deleteMany({ project: projectId });
        await models_1.Approval.deleteMany({ project: projectId });
        // Pull project from all users' assignedProjects list
        await models_1.User.updateMany({ assignedProjects: projectId }, { $pull: { assignedProjects: projectId } });
        // Delete the project itself
        await models_1.Project.findByIdAndDelete(projectId);
        // Log global system audit
        await (0, auditLogger_1.logAudit)(req, projectId, 'DELETE_PROJECT', 'Project', projectId, `Deleted project: ${project.name} and all related module data.`);
        return res.json({ message: 'Project and all related data deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.deleteProject = deleteProject;
const loadTestProject = async (req, res) => {
    try {
        const userId = req.user._id;
        // Create the test project
        const project = await models_1.Project.create({
            name: "Proyecto IoT Domótica Inteligente con IA",
            description: "Sistema avanzado de monitoreo de temperatura, detección de anomalías y control automatizado de consumo energético residencial usando MQTT y modelos de regresión lineal.",
            problem: "Los sistemas de domótica actuales carecen de optimización energética contextualizada e inteligente, lo que se traduce en altos consumos de electricidad y nula previsión de fallos en equipos.",
            objectives: "Desarrollar una plataforma integrada de IoT con visualización en tiempo real, alarmas predictivas para fallos de climatización y un motor de reglas automatizadas.",
            restrictions: "Debe operar con microcontroladores ESP32, usar protocolos livianos (MQTT), y la interfaz de usuario debe responder en menos de 200ms.",
            companyName: "Inmobiliaria Futuro S.A.",
            companyContact: "Contacto: contacto@futuro.cl",
            methodology: "Scrum"
        });
        const projectId = project._id;
        // 1. Team Members
        await models_1.TeamMember.create({
            user: userId,
            project: projectId,
            role: 'Admin',
            operationalRole: 'Director de Tesis / Creador',
            workload: 50,
            canComment: true
        });
        const benjamin = await models_1.User.findOne({ rut: '21.450.830-3' });
        if (benjamin) {
            await models_1.TeamMember.create({
                user: benjamin._id,
                project: projectId,
                role: 'Editor',
                operationalRole: 'Desarrollador Backend',
                workload: 100,
                canComment: true
            });
        }
        const paolo = await models_1.User.findOne({ rut: '20.994.544-4' });
        if (paolo) {
            await models_1.TeamMember.create({
                user: paolo._id,
                project: projectId,
                role: 'Editor',
                operationalRole: 'Desarrollador Frontend & UX',
                workload: 100,
                canComment: true
            });
        }
        // Add project to creator's assignedProjects
        await models_1.User.findByIdAndUpdate(userId, {
            $addToSet: { assignedProjects: projectId }
        });
        // 2. Requirements
        const req1 = await models_1.Requirement.create({
            project: projectId,
            owner: userId,
            code: "RF-01",
            title: "Monitoreo de Sensores en Tiempo Real",
            description: "La interfaz gráfica debe desplegar un gráfico de línea continuo que muestre los datos de temperatura y humedad enviados por los nodos ESP32 con una latencia inferior a 500ms.",
            priority: "Alta",
            status: "Implemented",
            category: "Functional",
            origin: "Minuta de Kickoff",
            impactAnalysis: "Afecta la carga de la base de datos y requiere suscripción WebSockets en el cliente."
        });
        const req2 = await models_1.Requirement.create({
            project: projectId,
            owner: userId,
            code: "RF-02",
            title: "Control Manual de Climatización",
            description: "El usuario debe poder encender y apagar los sistemas de calefacción o aire acondicionado de manera manual presionando un interruptor digital desde la plataforma web.",
            priority: "Media",
            status: "In_Progress",
            category: "Functional",
            origin: "Requerimientos Inmobiliaria",
            impactAnalysis: "Requiere validación de permisos de usuario y publicación en el broker MQTT."
        });
        const req3 = await models_1.Requirement.create({
            project: projectId,
            owner: userId,
            code: "RN-01",
            title: "Cifrado de Datos IoT",
            description: "Toda la comunicación de telemetría transmitida vía protocolo MQTT desde los dispositivos hacia el broker centralizado debe estar cifrada usando TLS 1.3.",
            priority: "Alta",
            status: "Approved",
            category: "Non-Functional",
            origin: "Análisis de Seguridad",
            impactAnalysis: "Incrementa el uso de CPU de los microcontroladores y la latencia inicial de negociación."
        });
        // 3. Meetings
        await models_1.Meeting.create({
            project: projectId,
            owner: userId,
            title: "Minuta Reunión de Arranque (Kickoff)",
            date: new Date(),
            transcription: "Sebastian: Iniciamos el desarrollo del proyecto de domótica. Benjamin configurará el backend y Paolo el front. Acordamos usar MQTT y React con Tailwind CSS. Paolo: Sí, haré la vista de monitoreo en tiempo real. Benjamin: Yo levantaré el broker Mosquitto en Render.",
            summary: "Reunión de coordinación técnica para establecer las bases de ThesisFlow IoT. Se definieron las tecnologías a utilizar y las responsabilidades de los miembros del equipo.",
            agreements: [
                "Usar MQTT sobre TLS 1.3 para seguridad.",
                "Sebastian liderará el diseño de arquitectura general.",
                "Paolo implementará gráficos de telemetría."
            ],
            tasks: [
                "Levantar broker Mosquitto en Render (Benjamin)",
                "Crear primer mock de interfaz React (Paolo)"
            ],
            risks: [
                "Latencia de red del broker gratuito de Render."
            ]
        });
        // 4. ADR Decisions
        const adr = await models_1.ADRDecision.create({
            project: projectId,
            owner: userId,
            code: "ADR-001",
            title: "Uso de Protocolo MQTT sobre HTTP",
            status: "Accepted",
            context: "Necesitamos un protocolo de comunicación bidireccional y liviano para conectar los microcontroladores ESP32 con el servidor central.",
            decision: "Adoptar el protocolo de mensajería Publish/Subscribe MQTT debido a su bajo overhead, permitiendo transferencias rápidas en redes móviles o inestables.",
            consequences: "Se introduce la necesidad de administrar un Broker MQTT (Mosquitto) y configurar suscripciones WebSockets en la aplicación React.",
            alternatives: [
                { title: "HTTP REST Polling", status: "Rejected", justification: "Alto consumo de ancho de banda y batería de dispositivos debido al polling periódico." },
                { title: "WebSockets directos", status: "Rejected", justification: "Complejo de implementar y mantener a gran escala en microcontroladores con recursos limitados." }
            ]
        });
        // 5. Diagrams
        await models_1.Diagram.create({
            project: projectId,
            owner: userId,
            title: "Diagrama de Arquitectura Física IoT",
            description: "Diagrama de flujo que ilustra la conexión de sensores físicos ESP32 con el broker Mosquitto y el backend ThesisFlow.",
            type: "Flowchart",
            code: `graph TD
    ESP32[Nodos ESP32 de Sensores] -->|MQTT/TLS 1.3| Mosquitto[Broker Mosquitto]
    Mosquitto -->|WebSockets| Backend[Backend NodeJS]
    Backend -->|JSON| Frontend[Cliente React SPA]
    Backend -->|Mongoose| MongoDB[(MongoDB Cloud Atlas)]`
        });
        // 6. Tasks
        const t1 = await models_1.Task.create({
            project: projectId,
            code: "TSK-001",
            title: "Configurar Broker MQTT Mosquitto",
            description: "Lanzar un contenedor Docker con Mosquitto, habilitar autenticación por credenciales y cargar certificados SSL/TLS.",
            status: "Completed",
            priority: "High",
            assignedTo: benjamin ? benjamin._id : undefined
        });
        const t2 = await models_1.Task.create({
            project: projectId,
            code: "TSK-002",
            title: "Implementar Gráfico de Línea de Temperatura",
            description: "Integrar Recharts o Chart.js en la página de monitoreo para graficar datos de sensores recibidos via WebSocket.",
            status: "In_Progress",
            priority: "Medium",
            assignedTo: paolo ? paolo._id : undefined
        });
        // 7. Documents
        await models_1.Document.create({
            project: projectId,
            owner: userId,
            title: "Capítulo I. Introducción y Negocio",
            templateType: "Introducción del Proyecto",
            content: `# Capítulo I. Introducción

En el contexto actual de las Smart Cities y el hogar inteligente, la optimización energética residencial se ha convertido en una prioridad clave para reducir la huella de carbono y amortiguar los costos de vida de las familias chilenas.

Este proyecto tiene como objetivo diseñar e implementar una arquitectura IoT abierta e inteligente para inmobiliarias, integrando microcontroladores de bajo costo y comunicación en tiempo real para optimizar la toma de decisiones climatizadoras de forma proactiva.`,
            status: "Draft"
        });
        // 8. Trace Links
        await models_1.TraceLink.create({
            project: projectId,
            sourceId: req1._id,
            sourceType: "Requirement",
            targetId: t2._id,
            targetType: "Task",
            description: "La tarea implementa el gráfico en tiempo real del requerimiento funcional RF-01."
        });
        await models_1.TraceLink.create({
            project: projectId,
            sourceId: req3._id,
            sourceType: "Requirement",
            targetId: adr._id,
            targetType: "ADRDecision",
            description: "El requerimiento no funcional de cifrado está sustentado por la decisión arquitectónica ADR-001."
        });
        // Audit Log
        await (0, auditLogger_1.logAudit)(req, projectId.toString(), 'CREATE_PROJECT', 'Project', projectId.toString(), `Created complete test project with mock data for testing purposes.`);
        return res.status(201).json({
            message: "Proyecto de prueba completo cargado exitosamente.",
            project
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.loadTestProject = loadTestProject;
const getAdvisorDashboardSummary = async (req, res) => {
    try {
        const isDocente = req.user.role === 'Docente';
        const isEvaluador = req.user.role === 'Evaluador';
        const isCoordinador = req.user.role === 'Coordinador';
        const isAdmin = req.user.role === 'Admin';
        if (!isDocente && !isEvaluador && !isCoordinador && !isAdmin) {
            return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Docente, Evaluador o Coordinador.' });
        }
        // Find all projects where this user is member
        let memberships = [];
        if (isAdmin) {
            const allProjects = await models_1.Project.find({});
            memberships = allProjects.map(p => ({ project: p._id }));
        }
        else {
            memberships = await models_1.TeamMember.find({ user: req.user._id });
        }
        if (memberships.length === 0) {
            return res.json({
                kpis: {
                    totalProjects: 0,
                    totalStudents: 0,
                    pendingReviewsCount: 0,
                    pendingEvaluationsCount: 0,
                    criticalAlertsCount: 0
                },
                projects: [],
                pendingReviews: [],
                recentActivity: []
            });
        }
        const projectIds = memberships.map(m => m.project);
        const projects = await models_1.Project.find({ _id: { $in: projectIds } });
        // Fetch collections in parallel
        const [teamMembers, meetings, tasks, requirements, adrs, documents, evaluations, traceLinks, documentReviews, proposals, auditLogs] = await Promise.all([
            models_1.TeamMember.find({ project: { $in: projectIds } }).populate('user', 'name rut role isActivated'),
            models_1.Meeting.find({ project: { $in: projectIds } }).sort({ date: -1 }),
            models_1.Task.find({ project: { $in: projectIds } }).sort({ dueDate: 1 }),
            models_1.Requirement.find({ project: { $in: projectIds } }),
            models_1.ADRDecision.find({ project: { $in: projectIds } }),
            models_1.Document.find({ project: { $in: projectIds } }),
            models_1.ProjectEvaluation.find({ project: { $in: projectIds } }),
            models_1.TraceLink.find({ project: { $in: projectIds } }),
            models_1.DocumentReview.find({ reviewer: req.user._id, status: { $in: ['Submitted', 'InReview'] } }),
            models_1.ProjectProposal.find({ assignedAdvisor: req.user._id, status: { $in: ['Submitted', 'InReview'] } }),
            models_1.AuditLog.find({ project: { $in: projectIds } }).sort({ timestamp: -1 }).limit(15)
        ]);
        const processedProjects = projects.map(p => {
            const projIdStr = p._id.toString();
            // Members & students
            const projMembers = teamMembers.filter(m => m.project.toString() === projIdStr);
            const studentsList = projMembers.filter(m => m.user && !['Docente', 'Evaluador', 'Coordinador', 'Admin'].includes(m.user.role));
            // Tasks
            const projTasks = tasks.filter(t => t.project.toString() === projIdStr);
            const completedTasksCount = projTasks.filter(t => t.status === 'Done').length;
            const progress = projTasks.length > 0 ? Math.round((completedTasksCount / projTasks.length) * 100) : 0;
            const expiredTasks = projTasks.filter(t => t.status !== 'Done' &&
                t.dueDate &&
                new Date(t.dueDate).getTime() < Date.now());
            // Meetings
            const projMeetings = meetings.filter(m => m.project.toString() === projIdStr);
            const lastMeeting = projMeetings.length > 0 ? projMeetings[0] : null;
            // Requirements consistency
            const projRequirements = requirements.filter(r => r.project.toString() === projIdStr);
            const requirementIdsLinkedToTasks = new Set(traceLinks
                .filter(tl => tl.project.toString() === projIdStr && tl.sourceType === 'Requirement' && tl.targetType === 'Task')
                .map(tl => tl.sourceId.toString()));
            const orphanRequirementsCount = projRequirements.filter(r => !requirementIdsLinkedToTasks.has(r._id.toString())).length;
            const unverifiedRequirementsCount = projRequirements.filter(r => !r.linkedTests || r.linkedTests.length === 0).length;
            // ADRs & chapters
            const projADRs = adrs.filter(a => a.project.toString() === projIdStr);
            const pendingADRs = projADRs.filter(a => a.status === 'InReview').length;
            const projDocs = documents.filter(d => d.project.toString() === projIdStr);
            const currentDeliverable = projDocs.length > 0 ? projDocs[0].title : 'Ninguno';
            // Assemble alerts
            const alerts = [];
            if (projMeetings.length === 0) {
                alerts.push({ type: 'warning', message: 'No se han registrado minutas de reunión.' });
            }
            else if (lastMeeting) {
                const days = Math.floor((Date.now() - new Date(lastMeeting.date).getTime()) / (1000 * 60 * 60 * 24));
                if (days > 21) {
                    alerts.push({ type: 'danger', message: `Sin reuniones en los últimos ${days} días.` });
                }
                else if (days > 14) {
                    alerts.push({ type: 'warning', message: `Sin reuniones en los últimos ${days} días.` });
                }
            }
            if (expiredTasks.length > 0) {
                alerts.push({ type: 'danger', message: `${expiredTasks.length} tareas vencidas sin completar.` });
            }
            if (orphanRequirementsCount > 0) {
                alerts.push({ type: 'warning', message: `${orphanRequirementsCount} requerimientos huérfanos (sin tareas).` });
            }
            if (unverifiedRequirementsCount > 0) {
                alerts.push({ type: 'warning', message: `${unverifiedRequirementsCount} requerimientos sin pruebas de verificación.` });
            }
            if (pendingADRs > 0) {
                alerts.push({ type: 'info', message: `${pendingADRs} decisiones de arquitectura (ADRs) en revisión.` });
            }
            // Calculate risk level
            let risk = 'Low';
            const dangerAlertsCount = alerts.filter(a => a.type === 'danger').length;
            const warningAlertsCount = alerts.filter(a => a.type === 'warning').length;
            if (dangerAlertsCount > 0 || warningAlertsCount >= 3) {
                risk = 'High';
            }
            else if (warningAlertsCount > 0 || expiredTasks.length > 0) {
                risk = 'Medium';
            }
            // Last activity date
            let lastActivityDate = p.createdAt;
            if (projMeetings.length > 0 && new Date(projMeetings[0].date).getTime() > new Date(lastActivityDate).getTime()) {
                lastActivityDate = projMeetings[0].date;
            }
            if (projTasks.length > 0) {
                const lastTaskDate = projTasks.reduce((max, t) => new Date(t.updatedAt || t.createdAt).getTime() > new Date(max).getTime() ? (t.updatedAt || t.createdAt) : max, p.createdAt);
                if (new Date(lastTaskDate).getTime() > new Date(lastActivityDate).getTime()) {
                    lastActivityDate = lastTaskDate;
                }
            }
            return {
                _id: p._id,
                name: p.name,
                description: p.description,
                companyName: p.companyName,
                methodology: p.methodology,
                members: projMembers.map(m => ({
                    _id: m._id,
                    user: m.user,
                    operationalRole: m.operationalRole,
                    workload: m.workload
                })),
                students: studentsList.map(s => ({
                    _id: s._id,
                    user: s.user,
                    operationalRole: s.operationalRole,
                    tasksCount: projTasks.filter(t => t.assignedTo && t.assignedTo.toString() === s.user?._id?.toString()).length,
                    tasksCompletedCount: projTasks.filter(t => t.assignedTo && t.assignedTo.toString() === s.user?._id?.toString() && t.status === 'Done').length,
                    meetingsCount: projMeetings.filter(m => m.participants.some((pt) => pt.name === s.user?.name)).length,
                    evaluationsReceived: evaluations.filter(e => e.targetType === 'Student' && e.studentTarget?.toString() === s.user?._id?.toString()).map(e => ({
                        rubricName: e.rubricName,
                        totalScore: e.totalScore,
                        status: e.status
                    }))
                })),
                progress,
                risk,
                alerts,
                alertsCount: alerts.length,
                currentDeliverable,
                lastActivityDate,
                createdAt: p.createdAt
            };
        });
        const pendingReviewsCount = documentReviews.length + proposals.length;
        const criticalAlertsCount = processedProjects.filter(p => p.risk === 'High').length;
        const pendingEvaluationsCount = processedProjects.length;
        const recentActivity = auditLogs.map(log => ({
            _id: log._id,
            projectName: projects.find(p => p._id.toString() === log.project.toString())?.name || 'Tesis',
            userName: log.userName,
            action: log.action,
            resourceType: log.resourceType,
            details: log.details,
            timestamp: log.timestamp
        }));
        const kpis = {
            totalProjects: processedProjects.length,
            totalStudents: teamMembers.filter(m => m.user && !['Docente', 'Evaluador', 'Coordinador', 'Admin'].includes(m.user.role)).length,
            pendingReviewsCount,
            pendingEvaluationsCount,
            criticalAlertsCount
        };
        const combinedPendingReviews = [
            ...documentReviews.map(r => ({
                _id: r._id,
                project: r.project,
                itemType: r.itemType,
                itemTitle: r.itemTitle,
                version: r.version,
                requestedByName: r.requestedByName,
                submittedAt: r.submittedAt || r.createdAt
            })),
            ...proposals.map(pr => ({
                _id: pr._id,
                project: pr.project,
                itemType: 'Proposal',
                itemTitle: pr.title,
                version: 1,
                requestedByName: pr.studentName,
                submittedAt: pr.submittedAt || pr.createdAt
            }))
        ];
        return res.json({
            kpis,
            projects: processedProjects,
            pendingReviews: combinedPendingReviews,
            recentActivity
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en getAdvisorDashboardSummary', error: error.message });
    }
};
exports.getAdvisorDashboardSummary = getAdvisorDashboardSummary;
