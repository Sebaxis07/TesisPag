import { AuditLog } from '../models';

export const logAudit = async (
  req: any,
  projectId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: string
) => {
  try {
    if (!req.user) {
      console.warn('AuditLog warning: req.user is undefined for action:', action);
      return;
    }

    await AuditLog.create({
      project: projectId,
      user: req.user._id,
      userName: req.user.name,
      action,
      resourceType,
      resourceId,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to save Audit Log:', err);
  }
};
