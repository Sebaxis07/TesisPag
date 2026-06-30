import { Response } from 'express';
import { Notification } from '../models';
import { ProjectAuthRequest } from '../middleware/auth';

// Get notifications for user inside project context
export const getNotificationsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const notifications = await Notification.find({
      user: userId,
      project: projectId
    }).sort({ createdAt: -1 });

    return res.json(notifications);
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json(notification);
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
