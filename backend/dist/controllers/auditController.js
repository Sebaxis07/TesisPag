"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const models_1 = require("../models");
const getAuditLogs = async (req, res) => {
    try {
        const { projectId } = req.params;
        // Fetch and sort audit logs descending by timestamp
        const logs = await models_1.AuditLog.find({ project: projectId })
            .sort({ timestamp: -1 })
            .limit(300);
        return res.status(200).json(logs);
    }
    catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
exports.getAuditLogs = getAuditLogs;
