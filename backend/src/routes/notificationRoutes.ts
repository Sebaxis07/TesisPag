import { Router } from 'express';
import { 
  getNotificationsByProject, 
  markNotificationAsRead,
  getUserNotifications,
  markAllNotificationsAsRead,
  triggerDigest,
  getSentEmailsList,
  sendCustomEmail
} from '../controllers/notificationController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

// Global routes (user-specific)
router.get('/', getUserNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.post('/trigger-digest', triggerDigest);
router.get('/sent-emails', getSentEmailsList);
router.post('/send-custom-email', sendCustomEmail);

// Project-specific routes
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getNotificationsByProject);
router.put('/:id/read', markNotificationAsRead);

export default router;
