import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateRut, normalizeRut } from '../utils/rutHelper';

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
    path: '/api/auth', // Accessible only by auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { name, rut, password, role } = req.body;

    if (!name || !rut || !password) {
      return res.status(400).json({ message: 'Por favor, proporciona nombre, RUT y contraseña' });
    }

    if (!validateRut(rut)) {
      return res.status(400).json({ message: 'El RUT ingresado no es válido' });
    }

    const normalizedRut = normalizeRut(rut);

    const userExists = await User.findOne({ rut: normalizedRut });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      rut: normalizedRut,
      passwordHash,
      role: role || 'Viewer'
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
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

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({ message: 'Por favor, proporciona RUT y contraseña' });
    }

    const normalizedRut = normalizeRut(rut);
    const user = await User.findOne({ rut: normalizedRut });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setRefreshCookie(res, refreshToken);

    return res.json({
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

export const refresh = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies.tf_refresh;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Access denied. Session cookie missing.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    } catch (err) {
      res.clearCookie('tf_refresh', { path: '/api/auth' });
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.clearCookie('tf_refresh', { path: '/api/auth' });
      return res.status(401).json({ message: 'User not found.' });
    }

    // Refresh Token Rotation (RTR) - Issue new access and refresh tokens
    const nextAccessToken = generateAccessToken(user._id.toString());
    const nextRefreshToken = generateRefreshToken(user._id.toString());

    setRefreshCookie(res, nextRefreshToken);

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        rut: user.rut,
        role: user.role
      },
      accessToken: nextAccessToken
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    res.clearCookie('tf_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });
    return res.json({ message: 'Session cleared successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;

    if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.json({ message: 'User role updated successfully', user: { _id: user._id, role: user.role } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
