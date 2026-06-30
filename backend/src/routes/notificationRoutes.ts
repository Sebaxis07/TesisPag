import { Router } from 'express';
import { getNotificationsByProject, markNotificationAsRead } from '../controllers/notificationController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getNotificationsByProject);
router.put('/:id/read', markNotificationAsRead);

export default router;
