"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInviteGuest = exports.acceptInvite = exports.checkInviteToken = exports.getInvitesByProject = exports.createInvite = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const auditLogger_1 = require("../utils/auditLogger");
// Helper to set cookies and tokens for guest flow
const generateAccessToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });
};
const generateRefreshToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};
const setRefreshCookie = (res, token) => {
    res.cookie('tf_refresh', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};
// 1. Create Invite Link
const createInvite = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { email, canComment, expiresInDays } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email es requerido para generar la invitación.' });
        }
        // Role check (Admin or Editor can invite)
        if (req.projectRole !== 'Admin' && req.projectRole !== 'Editor' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Solo administradores o editores pueden invitar miembros.' });
        }
        const project = await models_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proyecto no encontrado.' });
        }
        // Generate cryptographically secure token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const days = expiresInDays || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const invite = await models_1.ProjectInvite.create({
            project: projectId,
            email,
            role: 'Viewer',
            canComment: canComment === undefined ? true : !!canComment,
            invitedBy: req.user._id,
            token,
            status: 'Pending',
            expiresAt
        });
        const inviteLink = `http://localhost:5173/invites/accept/${token}`;
        await (0, auditLogger_1.logAudit)(req, projectId, 'CREATE_INVITE', 'ProjectInvite', invite._id.toString(), `Invite created for ${email} with role Viewer (canComment: ${invite.canComment})`);
        return res.status(201).json({ invite, inviteLink });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.createInvite = createInvite;
// 2. Get active invites for a project
const getInvitesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const invites = await models_1.ProjectInvite.find({ project: projectId }).sort({ createdAt: -1 });
        return res.json(invites);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getInvitesByProject = getInvitesByProject;
// 3. Public check invite validity
const checkInviteToken = async (req, res) => {
    try {
        const { token } = req.params;
        const invite = await models_1.ProjectInvite.findOne({ token }).populate('project', 'name');
        if (!invite) {
            return res.status(404).json({ valid: false, message: 'El enlace de invitación es inválido.' });
        }
        if (invite.status !== 'Pending') {
            return res.status(400).json({ valid: false, message: `Esta invitación ya fue ${invite.status.toLowerCase()}.` });
        }
        if (invite.expiresAt < new Date()) {
            invite.status = 'Expired';
            await invite.save();
            return res.status(400).json({ valid: false, message: 'El enlace de invitación ha expirado.' });
        }
        return res.json({ valid: true, invite });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.checkInviteToken = checkInviteToken;
// 4. Accept/Redeem invitation link (Requires authentication)
const acceptInvite = async (req, res) => {
    try {
        const { token } = req.params;
        const invite = await models_1.ProjectInvite.findOne({ token });
        if (!invite) {
            return res.status(404).json({ message: 'El enlace de invitación es inválido.' });
        }
        if (invite.status !== 'Pending') {
            return res.status(400).json({ message: `Esta invitación ya fue ${invite.status.toLowerCase()}.` });
        }
        if (invite.expiresAt < new Date()) {
            invite.status = 'Expired';
            await invite.save();
            return res.status(400).json({ message: 'El enlace de invitación ha expirado.' });
        }
        // Check if user is already a member of this project
        let member = await models_1.TeamMember.findOne({ project: invite.project, user: req.user._id });
        if (member) {
            // User is already a member, just mark invite as accepted
            invite.status = 'Accepted';
            invite.acceptedBy = req.user._id;
            invite.acceptedAt = new Date();
            await invite.save();
            return res.json({ message: 'Ya eres miembro de este proyecto.', projectId: invite.project });
        }
        // Create TeamMember
        member = await models_1.TeamMember.create({
            project: invite.project,
            user: req.user._id,
            role: invite.role,
            operationalRole: 'Observador Externo',
            workload: 0,
            canComment: invite.canComment
        });
        invite.status = 'Accepted';
        invite.acceptedBy = req.user._id;
        invite.acceptedAt = new Date();
        await invite.save();
        await (0, auditLogger_1.logAudit)(req, invite.project.toString(), 'ACCEPT_INVITE', 'TeamMember', member._id.toString(), `User ${req.user.name} joined project via invitation link.`);
        return res.json({ message: 'Invitación aceptada correctamente.', projectId: invite.project });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.acceptInvite = acceptInvite;
// 5. Accept invitation as Guest without registration / login
const acceptInviteGuest = async (req, res) => {
    try {
        const { token } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nombre es requerido para entrar como invitado.' });
        }
        const invite = await models_1.ProjectInvite.findOne({ token });
        if (!invite) {
            return res.status(404).json({ message: 'El enlace de invitación es inválido.' });
        }
        if (invite.status !== 'Pending') {
            return res.status(400).json({ message: `Esta invitación ya fue ${invite.status.toLowerCase()}.` });
        }
        if (invite.expiresAt < new Date()) {
            invite.status = 'Expired';
            await invite.save();
            return res.status(400).json({ message: 'El enlace de invitación ha expirado.' });
        }
        // Auto-generate a guest user
        const guestRut = `guest-${token.substring(0, 12)}`.toLowerCase();
        // Find or create guest user
        let user = await models_1.User.findOne({ rut: guestRut });
        if (!user) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(crypto_1.default.randomBytes(16).toString('hex'), salt);
            user = await models_1.User.create({
                name: name.trim(),
                rut: guestRut,
                passwordHash,
                role: 'Viewer'
            });
        }
        else {
            // Update name in case they change it
            user.name = name.trim();
            await user.save();
        }
        // Check if team member exists
        let member = await models_1.TeamMember.findOne({ project: invite.project, user: user._id });
        if (!member) {
            member = await models_1.TeamMember.create({
                project: invite.project,
                user: user._id,
                role: 'Viewer',
                operationalRole: 'Invitado Externo',
                workload: 0,
                canComment: invite.canComment
            });
        }
        invite.status = 'Accepted';
        invite.acceptedBy = user._id;
        invite.acceptedAt = new Date();
        await invite.save();
        // Log audit
        const auditReq = {
            ...req,
            user: { _id: user._id, name: user.name, role: 'Viewer' }
        };
        await (0, auditLogger_1.logAudit)(auditReq, invite.project.toString(), 'ACCEPT_INVITE_GUEST', 'TeamMember', member._id.toString(), `Guest user ${user.name} joined project without password/login.`);
        // Generate tokens
        const accessToken = generateAccessToken(user._id.toString());
        const refreshToken = generateRefreshToken(user._id.toString());
        setRefreshCookie(res, refreshToken);
        return res.json({
            message: 'Invitación aceptada como invitado correctamente.',
            projectId: invite.project,
            user: {
                _id: user._id,
                name: user.name,
                rut: user.rut,
                role: user.role
            },
            accessToken
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.acceptInviteGuest = acceptInviteGuest;
