import { Router } from 'express';
import { 
  requestApproval, 
  submitApproval, 
  getProjectApprovals 
} from '../controllers/approvalController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), requestApproval);
router.post('/:id/review', checkProjectPermission(['Admin', 'Editor', 'Viewer']), submitApproval);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getProjectApprovals);

export default router;
