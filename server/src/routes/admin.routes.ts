import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Strictly protect all /api/admin/** endpoints for ADMIN
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/department/join-code', AdminController.getDepartmentJoinCode);
router.post('/generate', AdminController.generateSchedule);
router.post('/solve', AdminController.generateSchedule);
router.post('/publish', AdminController.publishTimetable);
router.post('/lock/:entryId', AdminController.toggleLock);
router.delete('/schedule', AdminController.clearSchedule);

export default router;
