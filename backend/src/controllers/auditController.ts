import { Response } from 'express';
import { ProjectAuthRequest } from '../middleware/auth';
import { AuditLog } from '../models';

export const getAuditLogs = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Fetch and sort audit logs descending by timestamp
    const logs = await AuditLog.find({ project: projectId })
      .sort({ timestamp: -1 })
      .limit(300);

    return res.status(200).json(logs);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
