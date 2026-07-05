import { Router } from 'express';
import { 
  createDocument, 
  getDocumentsByProject, 
  getDocumentById, 
  updateDocument, 
  deleteDocument, 
  generateReportSectionAI,
  autocompleteReportSectionAI,
  getInlineSuggestionAI,
  commitDocumentVersion,
  bindParagraphEvidence,
  citeSource,
  exportDocumentPDF,
  exportDocumentDOCX,
  checkReportConsistency,
  critiqueReportSection,
  evaluateReportRubric
} from '../controllers/reportController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createDocument);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getDocumentsByProject);

router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/generate-section', generateReportSectionAI);
router.post('/:id/autocomplete', autocompleteReportSectionAI);
router.post('/:id/inline-suggest', getInlineSuggestionAI);

// Academic workspace advanced endpoints
router.post('/:id/commit', commitDocumentVersion);
router.post('/:id/evidence/bind', bindParagraphEvidence);
router.post('/:id/cite', citeSource);
router.post('/:id/export/pdf', exportDocumentPDF);
router.post('/:id/export/docx', exportDocumentDOCX);
router.post('/:id/consistency', checkReportConsistency);
router.post('/:id/critique', critiqueReportSection);
router.post('/:id/check-rubric', evaluateReportRubric);

export default router;
