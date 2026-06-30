import { Router } from 'express';
import { createInvite, getInvitesByProject, checkInviteToken, acceptInvite, acceptInviteGuest } from '../controllers/inviteController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

// Public check
router.get('/check/:token', checkInviteToken);

// Accept (requires authentication)
router.post('/accept/:token', protect, acceptInvite);

// Accept as Guest (does NOT require prior authentication / login)
router.post('/accept-guest/:token', acceptInviteGuest);

// Scoped to projects
router.post('/project/:projectId', protect, checkProjectPermission(['Admin', 'Editor']), createInvite);
router.get('/project/:projectId', protect, checkProjectPermission(['Admin', 'Editor', 'Viewer']), getInvitesByProject);

export default router;
