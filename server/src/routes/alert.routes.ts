import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = Router();

router.get('/', AlertController.getAlerts);
router.patch('/:id/read', AlertController.markRead);
router.delete('/', authenticateToken, AlertController.clearAll);

export default router;
