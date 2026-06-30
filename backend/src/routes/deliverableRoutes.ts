import { Router } from 'express';
import multer from 'multer';
import { 
  createDeliverable, 
  uploadVersion, 
  freezeDeliverable, 
  getProjectDeliverables, 
  downloadVersion 
} from '../controllers/deliverableController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createDeliverable);
router.post('/:id/version', upload.single('file'), checkProjectPermission(['Admin', 'Editor']), uploadVersion);
router.patch('/:id/freeze', checkProjectPermission(['Admin']), freezeDeliverable);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getProjectDeliverables);
router.get('/:id/download/:versionNumber', checkProjectPermission(['Admin', 'Editor', 'Viewer']), downloadVersion);

export default router;
