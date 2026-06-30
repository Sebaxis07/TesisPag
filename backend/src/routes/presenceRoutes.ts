import { Router } from 'express';
import { heartbeat, getProjectPresence } from '../controllers/presenceController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/heartbeat', heartbeat);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getProjectPresence);

export default router;
