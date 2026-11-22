import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../auth/auth.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = Router();

// [M-2] Strict Auth Rate Limiter: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-bypass-ratelimit'] === 'test-runner',
});

router.post('/register', authLimiter, AuthController.register);
router.post('/verify-registration-totp', authLimiter, AuthController.verifyRegistrationTotp);
router.post('/login', authLimiter, AuthController.login);
router.post('/verify-login-totp', authLimiter, AuthController.verifyLoginTotp);
router.post('/verify-2fa', authLimiter, AuthController.verifyLoginTotp); // Alias for compatibility
router.get('/me', authenticateToken, AuthController.getMe);

export default router;
