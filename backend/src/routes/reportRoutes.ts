import { Router } from 'express';
import { createDocument, getDocumentsByProject, getDocumentById, updateDocument, deleteDocument, generateReportSectionAI } from '../controllers/reportController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createDocument);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getDocumentsByProject);

router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/generate-section', generateReportSectionAI);

export default router;
