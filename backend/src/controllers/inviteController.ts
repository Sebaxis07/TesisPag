import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ProjectInvite, TeamMember, Project, User } from '../models';
import { ProjectAuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

// Helper to set cookies and tokens for guest flow
const generateAccessToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('tf_refresh', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// 1. Create Invite Link
export const createInvite = async (req: ProjectAuthRequest, res: Response) => {
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

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const days = expiresInDays || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const invite = await ProjectInvite.create({
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

    await logAudit(
      req,
      projectId,
      'CREATE_INVITE',
      'ProjectInvite',
      invite._id.toString(),
      `Invite created for ${email} with role Viewer (canComment: ${invite.canComment})`
    );

    return res.status(201).json({ invite, inviteLink });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Get active invites for a project
export const getInvitesByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const invites = await ProjectInvite.find({ project: projectId }).sort({ createdAt: -1 });
    return res.json(invites);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Public check invite validity
export const checkInviteToken = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await ProjectInvite.findOne({ token }).populate('project', 'name');

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
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Accept/Redeem invitation link (Requires authentication)
export const acceptInvite = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await ProjectInvite.findOne({ token });

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
    let member = await TeamMember.findOne({ project: invite.project, user: req.user._id });
    if (member) {
      // User is already a member, just mark invite as accepted
      invite.status = 'Accepted';
      invite.acceptedBy = req.user._id;
      invite.acceptedAt = new Date();
      await invite.save();
      return res.json({ message: 'Ya eres miembro de este proyecto.', projectId: invite.project });
    }

    // Create TeamMember
    member = await TeamMember.create({
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

    await logAudit(
      req,
      invite.project.toString(),
      'ACCEPT_INVITE',
      'TeamMember',
      member._id.toString(),
      `User ${req.user.name} joined project via invitation link.`
    );

    return res.json({ message: 'Invitación aceptada correctamente.', projectId: invite.project });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Accept invitation as Guest without registration / login
export const acceptInviteGuest = async (req: any, res: Response) => {
  try {
    const { token } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nombre es requerido para entrar como invitado.' });
    }

    const invite = await ProjectInvite.findOne({ token });
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
    let user = await User.findOne({ rut: guestRut });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);
      user = await User.create({
        name: name.trim(),
        rut: guestRut,
        passwordHash,
        role: 'Viewer'
      });
    } else {
      // Update name in case they change it
      user.name = name.trim();
      await user.save();
    }

    // Check if team member exists
    let member = await TeamMember.findOne({ project: invite.project, user: user._id });
    if (!member) {
      member = await TeamMember.create({
        project: invite.project,
        user: user._id,
        role: 'Viewer',
        operationalRole: 'Invitado Externo',
        workload: 0,
        canComment: invite.canComment
      });
    }

    invite.status = 'Accepted';
    invite.acceptedBy = user._id as any;
    invite.acceptedAt = new Date();
    await invite.save();

    // Log audit
    const auditReq = {
      ...req,
      user: { _id: user._id, name: user.name, role: 'Viewer' }
    };
    await logAudit(
      auditReq,
      invite.project.toString(),
      'ACCEPT_INVITE_GUEST',
      'TeamMember',
      member._id.toString(),
      `Guest user ${user.name} joined project without password/login.`
    );

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
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
