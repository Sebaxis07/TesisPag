import { Router } from 'express';
import { createDiagram, getDiagramsByProject, getDiagramById, updateDiagram, deleteDiagram, generateDiagramAI } from '../controllers/diagramController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createDiagram);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getDiagramsByProject);
router.post('/generate', checkProjectPermission(['Admin', 'Editor']), generateDiagramAI);

router.get('/:id', getDiagramById);
router.put('/:id', updateDiagram);
router.delete('/:id', deleteDiagram);

export default router;
