import { Router } from 'express';
import { createComment, replyComment, resolveComment, getProjectComments } from '../controllers/commentController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', createComment);
router.post('/:id/reply', replyComment);
router.patch('/:id/resolve', resolveComment);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getProjectComments);

export default router;
