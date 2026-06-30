"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.getNotificationsByProject = void 0;
const models_1 = require("../models");
// Get notifications for user inside project context
const getNotificationsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const notifications = await models_1.Notification.find({
            user: userId,
            project: projectId
        }).sort({ createdAt: -1 });
        return res.json(notifications);
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};
exports.getNotificationsByProject = getNotificationsByProject;
// Mark notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const notification = await models_1.Notification.findOne({
            _id: id,
            user: userId
        });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        notification.isRead = true;
        await notification.save();
        return res.json(notification);
    }
    catch (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
