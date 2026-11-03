import { Router } from 'express';
import { getSubjects, createSubject, updateSubject } from '../controllers/subjectController.js';
import { getSubjectModules, createModule } from '../controllers/moduleController.js';
import { authenticateToken, optionalAuthentication, requireRole, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { courseOverview } from '../services/courseOverview.js';

const router = Router();

router.get('/', optionalAuthentication, getSubjects);
router.get('/mine', authenticateToken, requireRole('faculty'), getSubjects);
router.get('/overview', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (user.role !== 'student' && user.role !== 'faculty')
      return res.status(403).json({ message: 'Course overview is available to students and faculty.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ courses: await courseOverview({ id: user.id, role: user.role }) });
  } catch (err) { next(err); }
});
router.post('/', authenticateToken, requireRole('faculty'), createSubject);
router.patch('/:subjectId', authenticateToken, requireRole('faculty'), updateSubject);

router.get('/:subjectId/modules', authenticateToken, getSubjectModules);
router.post('/:subjectId/modules', authenticateToken, requireRole('faculty'), upload.single('file'), createModule);

export default router;
