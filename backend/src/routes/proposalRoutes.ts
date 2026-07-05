import { Router } from 'express';
import { 
  createProposal, 
  getProposalById, 
  getProposalsByStudent, 
  getProposalsByProject, 
  getProposalsForAdvisor, 
  updateProposal, 
  submitProposal, 
  reviewProposal 
} from '../controllers/proposalController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', createProposal);
router.get('/student', getProposalsByStudent);
router.get('/advisor', getProposalsForAdvisor);
router.get('/project/:projectId', getProposalsByProject);
router.get('/:id', getProposalById);
router.put('/:id', updateProposal);
router.post('/:id/submit', submitProposal);
router.post('/:id/review', reviewProposal);

export default router;
