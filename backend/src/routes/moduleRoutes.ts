import { Router } from 'express';
import { completeModule, getModuleById, updateModule } from '../controllers/moduleController.js';
import { upload } from "../middleware/upload.js";
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.patch('/:id', authenticateToken, requireRole('faculty'), upload.single('file'), updateModule);
router.get('/:id', authenticateToken, getModuleById);

router.post('/:id/complete', authenticateToken, completeModule);

export default router;
