import { Router } from 'express';
import { completeModule, getModuleById } from '../controllers/moduleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.get('/:id', authenticateToken, getModuleById);

router.post('/:id/complete', authenticateToken, completeModule);

export default router;
