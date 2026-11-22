import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller.js';
import { authenticateToken, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Public / Authenticated read of schedule
router.get('/', ScheduleController.getSchedule);

// Protected removal of entry
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'TEACHER'), ScheduleController.removeEntry);

export default router;
