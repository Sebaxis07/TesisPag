"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.getUsers = exports.getMe = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const rutHelper_1 = require("../utils/rutHelper");
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
        path: '/api/auth', // Accessible only by auth endpoints
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};
const register = async (req, res) => {
    try {
        const { name, rut, password, role } = req.body;
        if (!name || !rut || !password) {
            return res.status(400).json({ message: 'Por favor, proporciona nombre, RUT y contraseña' });
        }
        if (!(0, rutHelper_1.validateRut)(rut)) {
            return res.status(400).json({ message: 'El RUT ingresado no es válido' });
        }
        const normalizedRut = (0, rutHelper_1.normalizeRut)(rut);
        const userExists = await models_1.User.findOne({ rut: normalizedRut });
        if (userExists) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await models_1.User.create({
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
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { rut, password } = req.body;
        if (!rut || !password) {
            return res.status(400).json({ message: 'Por favor, proporciona RUT y contraseña' });
        }
        const normalizedRut = (0, rutHelper_1.normalizeRut)(rut);
        const user = await models_1.User.findOne({ rut: normalizedRut });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
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
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.tf_refresh;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Access denied. Session cookie missing.' });
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
        }
        catch (err) {
            res.clearCookie('tf_refresh', { path: '/api/auth' });
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        const user = await models_1.User.findById(decoded.id).select('-passwordHash');
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
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        res.clearCookie('tf_refresh', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth'
        });
        return res.json({ message: 'Session cleared successfully.' });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        const user = await models_1.User.findById(req.user._id).select('-passwordHash');
        return res.json(user);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
const getUsers = async (req, res) => {
    try {
        const users = await models_1.User.find({}).select('-passwordHash');
        return res.json(users);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getUsers = getUsers;
const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.role = role;
        await user.save();
        return res.json({ message: 'User role updated successfully', user: { _id: user._id, role: user.role } });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.updateUserRole = updateUserRole;
