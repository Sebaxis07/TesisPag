import { Router } from 'express';
import { 
  createReviewRequest, 
  getReviewsByProject, 
  getReviewsForReviewer, 
  getReviewById, 
  submitReviewVerdict 
} from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', createReviewRequest);
router.get('/reviewer', getReviewsForReviewer);
router.get('/project/:projectId', getReviewsByProject);
router.get('/:id', getReviewById);
router.post('/:id/verdict', submitReviewVerdict);

export default router;
