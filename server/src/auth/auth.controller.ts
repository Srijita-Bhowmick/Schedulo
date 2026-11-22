import { Request, Response } from 'express';
import { AuthService, UserPayload } from './auth.service.js';
import { db } from '../db/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from './auth.middleware.js';
import { authenticator } from 'otplib';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const email = req.body.email || (req.body.username ? (req.body.username.includes('@') ? req.body.username : `${req.body.username}@schedulo.edu`) : null);
      const { password, name, role, teacherId, batchId } = req.body;
      const userName = name || req.body.username || 'Campus User';

      if (!email || !password) {
        res.status(400).json({ error: 'Email/username and password are required' });
        return;
      }

      const rawRole = (role || 'STUDENT').toString().toUpperCase();
      const userRole = ['ADMIN', 'TEACHER', 'STUDENT'].includes(rawRole) ? (rawRole as 'ADMIN' | 'TEACHER' | 'STUDENT') : 'STUDENT';

      const existing = AuthService.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      const { secret, otpauthUrl } = AuthService.generateTotpSecret(email);
      const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);
      const passwordHash = AuthService.hashPassword(password);
      const userId = `usr_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, role, name, totp_secret, is_totp_verified, teacher_id, batch_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `);

      stmt.run(
        userId,
        email.toLowerCase().trim(),
        passwordHash,
        userRole,
        userName.trim(),
        secret,
        teacherId || null,
        batchId || null,
        now
      );

      const devTotp = authenticator.generate(secret);
      console.log(`\n======================================================`);
      console.log(`[AUTH-2FA-REGISTER] User: ${email} | Role: ${userRole}`);
      console.log(`[AUTH-2FA-REGISTER] Terminal TOTP Code: >>> ${devTotp} <<<`);
      console.log(`======================================================\n`);

      res.status(201).json({
        message: 'Account created. Scan the QR code with Google Authenticator or any TOTP app, and verify the 6-digit code to activate.',
        userId,
        email: email.toLowerCase().trim(),
        role: userRole,
        totpSecret: secret,
        otpauthUrl,
        qrCodeDataUrl,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Internal server error during registration' });
    }
  }

  static async verifyRegistrationTotp(req: Request, res: Response): Promise<void> {
    try {
      const { email, totpCode } = req.body;

      if (!email || !totpCode) {
        res.status(400).json({ error: 'Email and 6-digit TOTP code are required' });
        return;
      }

      const user = AuthService.getUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isValid = AuthService.verifyTotp(totpCode.trim(), user.totp_secret);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid 6-digit verification code. Please check your authenticator app.' });
        return;
      }

      // Activate user
      db.prepare('UPDATE users SET is_totp_verified = 1 WHERE id = ?').run(user.id);

      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        teacherId: user.teacher_id,
        batchId: user.batch_id,
      };

      const token = AuthService.signAuthToken(payload);

      res.json({
        message: 'Account activated successfully with 2FA TOTP.',
        token,
        user: payload,
      });
    } catch (err: any) {
      console.error('Registration TOTP verification error:', err);
      res.status(500).json({ error: err.message || 'Error verifying TOTP' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const emailOrUser = req.body.email || req.body.username;
      const { password } = req.body;

      if (!emailOrUser || !password) {
        res.status(400).json({ error: 'Email/username and password are required' });
        return;
      }

      // Find user by exact email, or by email prefix (e.g. student.id or dr.roy)
      let user = AuthService.getUserByEmail(emailOrUser);
      if (!user) {
        // Try with @schedulo.edu
        user = AuthService.getUserByEmail(`${emailOrUser}@schedulo.edu`);
      }
      if (!user) {
        // Try searching user table by name or email LIKE
        user = db.prepare('SELECT * FROM users WHERE LOWER(email) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?)').get(`%${emailOrUser}%`, `%${emailOrUser}%`) as any;
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const passwordValid = AuthService.verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Check if user has completed initial 2FA registration
      if (!user.is_totp_verified) {
        const otpauthUrl = `otpauth://totp/Schedulo:${user.email}?secret=${user.totp_secret}&issuer=Schedulo`;
        const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);
        res.status(403).json({
          error: 'Account not yet activated. Please complete initial TOTP 2FA verification.',
          requiresRegistrationVerification: true,
          email: user.email,
          totpSecret: user.totp_secret,
          otpauthUrl,
          qrCodeDataUrl,
        });
        return;
      }

      // Issue temporary Pre-2FA token (expires in 5 minutes)
      const pre2faToken = AuthService.signPre2faToken(user.id, user.email);

      // Log dev-mode TOTP code in terminal for effortless local testing
      const devTotp = authenticator.generate(user.totp_secret);
      console.log(`\n======================================================`);
      console.log(`[AUTH-2FA-LOGIN] User: ${user.email} (${user.role})`);
      console.log(`[AUTH-2FA-LOGIN] Dev-Mode 6-Digit TOTP: >>> ${devTotp} <<<`);
      console.log(`======================================================\n`);

      res.json({
        message: 'Primary credentials verified. Please enter the 6-digit TOTP code from your Authenticator app.',
        requires2fa: true,
        pre2faToken,
        email: user.email,
        role: user.role,
        devTotp, // Also sent in payload for instant UI autofill
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  static async verifyLoginTotp(req: Request, res: Response): Promise<void> {
    try {
      const { pre2faToken, totpCode } = req.body;

      if (!pre2faToken || !totpCode) {
        res.status(400).json({ error: 'pre2faToken and 6-digit totpCode are required' });
        return;
      }

      let tokenData: { userId: string; email: string };
      try {
        tokenData = AuthService.verifyPre2faToken(pre2faToken);
      } catch (tokenErr) {
        res.status(401).json({ error: 'Pre-2FA session expired or invalid. Please sign in again.' });
        return;
      }

      const user = AuthService.getUserById(tokenData.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isValid = AuthService.verifyTotp(totpCode.trim(), user.totp_secret);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid 6-digit TOTP code. Please try again.' });
        return;
      }

      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        teacherId: user.teacher_id,
        batchId: user.batch_id,
      };

      const fullToken = AuthService.signAuthToken(payload);

      res.json({
        message: '2FA authentication successful.',
        token: fullToken,
        user: payload,
      });
    } catch (err: any) {
      console.error('Login TOTP verification error:', err);
      res.status(500).json({ error: err.message || 'Failed to complete 2FA' });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = AuthService.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        teacherId: user.teacher_id,
        batchId: user.batch_id,
        isTotpVerified: Boolean(user.is_totp_verified),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user' });
    }
  }

  static getDevTotp(req: Request, res: Response): void {
    try {
      const secret = req.params.secret || 'JBSWY3DPEHPK3PXP';
      const token = authenticator.generate(secret);
      res.json({ token, secret });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
