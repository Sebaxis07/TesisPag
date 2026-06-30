"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRole = exports.checkProjectPermission = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            req.user = await models_1.User.findById(decoded.id).select('-passwordHash');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }
            if (req.user.role === 'Creador') {
                req.user.role = 'Admin';
            }
            return next();
        }
        catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
exports.protect = protect;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role ${req.user.role} does not have permission to perform this action.` });
        }
        next();
    };
};
exports.authorize = authorize;
const checkProjectPermission = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            // Find project context
            const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.body.project;
            if (!projectId) {
                return res.status(400).json({ message: 'Project context (projectId) is required for this action.' });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'Not authenticated' });
            }
            // If user is a system Admin, grand access
            if (req.user.role === 'Admin') {
                req.projectRole = 'Admin';
                return next();
            }
            const membership = await models_1.TeamMember.findOne({ project: projectId, user: req.user._id });
            if (!membership) {
                return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
            }
            if (!requiredRoles.includes(membership.role)) {
                return res.status(403).json({ message: `Access denied. Requires project role(s): ${requiredRoles.join(', ')}` });
            }
            req.projectRole = membership.role;
            return next();
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error checking project permissions.' });
        }
    };
};
exports.checkProjectPermission = checkProjectPermission;
const getProjectRole = async (userId, projectId) => {
    const membership = await models_1.TeamMember.findOne({ project: projectId, user: userId });
    return membership ? membership.role : null;
};
exports.getProjectRole = getProjectRole;
