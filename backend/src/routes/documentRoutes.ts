import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocumentsByProject, deleteDocument } from '../controllers/documentController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Accept a single file with field name 'file'
router.post('/upload', upload.single('file'), checkProjectPermission(['Admin', 'Editor']), uploadDocument);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getDocumentsByProject);
router.delete('/:id', deleteDocument);

export default router;
