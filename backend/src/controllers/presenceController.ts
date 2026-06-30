import { Response } from 'express';
import { PresenceSession } from '../models';
import { ProjectAuthRequest } from '../middleware/auth';

// 1. Send / Refresh Heartbeat
export const heartbeat = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId, currentView } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: 'ProjectId es requerido.' });
    }

    const userId = req.user._id;

    // Lightweight status cleanup of other sessions in the same project
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    await PresenceSession.updateMany(
      { project: projectId, lastHeartbeatAt: { $lt: fiveMinutesAgo, $gte: tenMinutesAgo }, status: 'Online' },
      { status: 'Away' }
    );

    await PresenceSession.updateMany(
      { project: projectId, lastHeartbeatAt: { $lt: tenMinutesAgo }, status: { $ne: 'Offline' } },
      { status: 'Offline' }
    );

    // Update or create active session
    let session = await PresenceSession.findOne({ project: projectId, user: userId });
    const now = new Date();

    if (session) {
      session.status = 'Online';
      session.currentView = currentView || session.currentView || '';
      session.lastHeartbeatAt = now;
      session.lastSeenAt = now;
      await session.save();
    } else {
      session = await PresenceSession.create({
        project: projectId,
        user: userId,
        status: 'Online',
        currentView: currentView || '',
        lastHeartbeatAt: now,
        lastSeenAt: now
      });
    }

    return res.json({ session });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Get active project presence sessions (within the last 2 hours)
export const getProjectPresence = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const sessions = await PresenceSession.find({
      project: projectId,
      lastSeenAt: { $gt: twoHoursAgo }
    })
      .populate('user', 'name rut role')
      .sort({ lastHeartbeatAt: -1 });

    return res.json(sessions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
