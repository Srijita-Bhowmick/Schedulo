import { Router } from 'express';
import { EntityController } from '../controllers/entity.controller.js';
import { authenticateToken, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Public / Authenticated read of domain entities
router.get('/', EntityController.getAll);

// Protected entity modifications (Admin only)
router.post('/teachers', authenticateToken, requireRole('ADMIN'), EntityController.createTeacher);
router.post('/teachers/:id/share', authenticateToken, requireRole('ADMIN'), EntityController.shareTeacher);
router.put('/teachers/:id', authenticateToken, requireRole('ADMIN'), EntityController.updateTeacher);
router.delete('/teachers/:id', authenticateToken, requireRole('ADMIN'), EntityController.deleteTeacher);

router.post('/rooms', authenticateToken, requireRole('ADMIN'), EntityController.createRoom);
router.put('/rooms/:id', authenticateToken, requireRole('ADMIN'), EntityController.updateRoom);
router.delete('/rooms/:id', authenticateToken, requireRole('ADMIN'), EntityController.deleteRoom);

router.post('/subjects', authenticateToken, requireRole('ADMIN'), EntityController.createSubject);
router.put('/subjects/:id', authenticateToken, requireRole('ADMIN'), EntityController.updateSubject);
router.delete('/subjects/:id', authenticateToken, requireRole('ADMIN'), EntityController.deleteSubject);

router.post('/batches', authenticateToken, requireRole('ADMIN'), EntityController.createBatch);
router.put('/batches/:id', authenticateToken, requireRole('ADMIN'), EntityController.updateBatch);
router.delete('/batches/:id', authenticateToken, requireRole('ADMIN'), EntityController.deleteBatch);

router.put('/config', authenticateToken, requireRole('ADMIN'), EntityController.updateConfig);

export default router;
