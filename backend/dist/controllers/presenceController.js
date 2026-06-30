"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectPresence = exports.heartbeat = void 0;
const models_1 = require("../models");
// 1. Send / Refresh Heartbeat
const heartbeat = async (req, res) => {
    try {
        const { projectId, currentView } = req.body;
        if (!projectId) {
            return res.status(400).json({ message: 'ProjectId es requerido.' });
        }
        const userId = req.user._id;
        // Lightweight status cleanup of other sessions in the same project
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        await models_1.PresenceSession.updateMany({ project: projectId, lastHeartbeatAt: { $lt: fiveMinutesAgo, $gte: tenMinutesAgo }, status: 'Online' }, { status: 'Away' });
        await models_1.PresenceSession.updateMany({ project: projectId, lastHeartbeatAt: { $lt: tenMinutesAgo }, status: { $ne: 'Offline' } }, { status: 'Offline' });
        // Update or create active session
        let session = await models_1.PresenceSession.findOne({ project: projectId, user: userId });
        const now = new Date();
        if (session) {
            session.status = 'Online';
            session.currentView = currentView || session.currentView || '';
            session.lastHeartbeatAt = now;
            session.lastSeenAt = now;
            await session.save();
        }
        else {
            session = await models_1.PresenceSession.create({
                project: projectId,
                user: userId,
                status: 'Online',
                currentView: currentView || '',
                lastHeartbeatAt: now,
                lastSeenAt: now
            });
        }
        return res.json({ session });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.heartbeat = heartbeat;
// 2. Get active project presence sessions (within the last 2 hours)
const getProjectPresence = async (req, res) => {
    try {
        const { projectId } = req.params;
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const sessions = await models_1.PresenceSession.find({
            project: projectId,
            lastSeenAt: { $gt: twoHoursAgo }
        })
            .populate('user', 'name rut role')
            .sort({ lastHeartbeatAt: -1 });
        return res.json(sessions);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.getProjectPresence = getProjectPresence;
