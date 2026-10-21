import { Router } from 'express';
import { completeModule } from '../controllers/moduleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/:id/complete', authenticateToken, completeModule);

export default router;
