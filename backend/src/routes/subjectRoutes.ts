import { Router } from 'express';
import { getSubjects, createSubject } from '../controllers/subjectController.js';
import { getSubjectModules, createModule } from '../controllers/moduleController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', authenticateToken, getSubjects);
router.post('/', authenticateToken, requireRole('faculty'), createSubject);

router.get('/:subjectId/modules', authenticateToken, getSubjectModules);
router.post('/:subjectId/modules', authenticateToken, requireRole('faculty'), upload.single('file'), createModule);

export default router;
