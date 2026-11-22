import { Router } from 'express';
import { AuthController } from '../auth/auth.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/verify-registration-totp', AuthController.verifyRegistrationTotp);
router.post('/login', AuthController.login);
router.post('/verify-login-totp', AuthController.verifyLoginTotp);
router.get('/me', authenticateToken, AuthController.getMe);

export default router;
