import { Router } from 'express';
import { 
  createRubric, 
  getRubrics, 
  getRubricById, 
  createProjectEvaluation, 
  getEvaluationsByProject, 
  getEvaluationById, 
  updateProjectEvaluation,
  getEvaluationsByEvaluator
} from '../controllers/evaluationController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/rubrics', createRubric);
router.get('/rubrics', getRubrics);
router.get('/rubrics/:id', getRubricById);

router.post('/', createProjectEvaluation);
router.get('/evaluator', getEvaluationsByEvaluator);
router.get('/project/:projectId', getEvaluationsByProject);
router.get('/projects/:projectId', getEvaluationsByProject);
router.post('/projects/:projectId', createProjectEvaluation);
router.get('/:id', getEvaluationById);
router.put('/:id', updateProjectEvaluation);

export default router;
