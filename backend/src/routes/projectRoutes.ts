import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  compareProjectStacks,
  generatePresentationDefense
} from '../controllers/projectController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

router.post('/:projectId/members', addTeamMember);
router.get('/:projectId/members', getTeamMembers);
router.delete('/members/:memberId', removeTeamMember);

// AI stack comparison route
router.post('/:projectId/compare-stacks', checkProjectPermission(['Admin', 'Editor', 'Viewer']), compareProjectStacks);
router.post('/:projectId/presentation-helper', checkProjectPermission(['Admin', 'Editor', 'Viewer']), generatePresentationDefense);

export default router;
