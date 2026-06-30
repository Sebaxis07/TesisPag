import { Router } from 'express';
import { createTask, getTasksByProject, getTaskById, updateTask, deleteTask } from '../controllers/taskController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createTask);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getTasksByProject);

router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
