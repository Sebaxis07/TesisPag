"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const models_1 = require("../models");
const logAudit = async (req, projectId, action, resourceType, resourceId, details) => {
    try {
        if (!req.user) {
            console.warn('AuditLog warning: req.user is undefined for action:', action);
            return;
        }
        await models_1.AuditLog.create({
            project: projectId,
            user: req.user._id,
            userName: req.user.name,
            action,
            resourceType,
            resourceId,
            details,
            timestamp: new Date()
        });
    }
    catch (err) {
        console.error('Failed to save Audit Log:', err);
    }
};
exports.logAudit = logAudit;
