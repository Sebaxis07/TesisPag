import { Router } from 'express';
import { 
  createRequirement, 
  getRequirementsByProject, 
  getRequirementById, 
  updateRequirement, 
  deleteRequirement, 
  extractRequirementsFromText,
  createRequirementsBulk 
} from '../controllers/requirementController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

// Routes requiring project-level role validation
router.post('/', checkProjectPermission(['Admin', 'Editor']), createRequirement);
router.post('/bulk', checkProjectPermission(['Admin', 'Editor']), createRequirementsBulk);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getRequirementsByProject);
router.post('/extract', checkProjectPermission(['Admin', 'Editor']), extractRequirementsFromText);

// Individual resource endpoints (roles/ownership checked dynamically in controller)
router.get('/:id', getRequirementById);
router.put('/:id', updateRequirement);
router.delete('/:id', deleteRequirement);

export default router;
