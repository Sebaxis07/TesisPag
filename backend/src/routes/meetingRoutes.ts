import { Router } from 'express';
import { createMeeting, getMeetingsByProject, getMeetingById, updateMeeting, deleteMeeting, triggerAISummary } from '../controllers/meetingController';
import { protect, checkProjectPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', checkProjectPermission(['Admin', 'Editor']), createMeeting);
router.get('/project/:projectId', checkProjectPermission(['Admin', 'Editor', 'Viewer']), getMeetingsByProject);

router.get('/:id', getMeetingById);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);
router.post('/:id/summarize', triggerAISummary);

export default router;
