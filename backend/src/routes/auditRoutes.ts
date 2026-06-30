import { Router } from 'express';
import { protect, checkProjectPermission } from '../middleware/auth';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

// Only Project Admins or System Admins can retrieve audit logs
router.get('/project/:projectId', protect, checkProjectPermission(['Admin']), getAuditLogs);

export default router;
