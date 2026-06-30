import { Router } from 'express';
import { createTraceLink, deleteTraceLink, getTraceLinksByProject } from '../controllers/traceLinkController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createTraceLink);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getTraceLinksByProject);
router.delete('/:id', deleteTraceLink);

export default router;
