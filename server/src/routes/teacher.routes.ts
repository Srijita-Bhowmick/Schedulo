import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller.js';
import { authenticateToken, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Strictly protect all /api/teacher/** endpoints for TEACHER (or ADMIN)
router.use(authenticateToken);
router.use(requireRole('TEACHER', 'ADMIN'));

router.post('/reschedule', TeacherController.handleReschedule);
router.post('/reschedule/validate', TeacherController.validateReschedule);
router.post('/reschedule/commit', TeacherController.commitReschedule);
router.put('/availability/:teacherId?', TeacherController.updateAvailability);

export default router;
