import { Router } from 'express';
import { 
  createADR, 
  getADRsByProject, 
  getADRById, 
  updateADR, 
  deleteADR, 
  submitADRForReview, 
  submitADRReview, 
  getADRReviews 
} from '../controllers/adrController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createADR);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getADRsByProject);

router.post('/:id/submit', submitADRForReview);
router.post('/:id/reviews', submitADRReview);
router.get('/:id/reviews', getADRReviews);

router.get('/:id', getADRById);
router.put('/:id', updateADR);
router.delete('/:id', deleteADR);

export default router;
