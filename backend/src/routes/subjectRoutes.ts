import { Router } from 'express';
import { getSubjects, createSubject } from '../controllers/subjectController.js';
import { getSubjectModules, createModule } from '../controllers/moduleController.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { courseOverview } from '../services/courseOverview.js';

const router = Router();

router.get('/', getSubjects);
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

router.get('/:subjectId/modules', authenticateToken, getSubjectModules);
router.post('/:subjectId/modules', authenticateToken, requireRole('faculty'), upload.single('file'), createModule);

export default router;
