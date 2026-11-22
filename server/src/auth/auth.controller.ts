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
      const {
        password,
        name,
        role,
        teacherId,
        batchId,
        departmentName,
        departmentCode,
        facultyJoinCode,
        workingDays,
        dayStartTime,
        periodDurationMins,
        periodsPerDay,
        collegeName,
        enable2fa,
      } = req.body;

      const userName = name || req.body.username || 'Campus User';

      if (!email || !password) {
        res.status(400).json({ error: 'Email/username and password are required' });
        return;
      }

      const rawRole = (role || 'STUDENT').toString().toUpperCase();
      const userRole = (rawRole === 'HOD' || rawRole === 'ADMIN') ? 'ADMIN' : (rawRole === 'TEACHER' ? 'TEACHER' : 'STUDENT');

      const existing = AuthService.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      const userId = `usr_${crypto.randomUUID()}`;
      let assignedDeptId: string | null = null;
      let generatedJoinCode: string | null = null;

      // --- SMART ROLE JOIN LOGIC ---
      if (userRole === 'ADMIN') {
        // HOD Registration: Create brand-new department directly during signup
        if (departmentName && departmentCode) {
          const cleanCode = departmentCode.toUpperCase().trim();
          assignedDeptId = `dept-${cleanCode.toLowerCase()}`;
          generatedJoinCode = `${cleanCode}-FAC-${Math.floor(100 + Math.random() * 900)}`;

          const workingDaysJson = JSON.stringify(
            workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          );

          db.prepare(`
            INSERT OR REPLACE INTO departments (
              id, name, code, hod_user_id, faculty_join_code, working_days, day_start_time, period_duration_mins, periods_per_day
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            assignedDeptId,
            departmentName.trim(),
            cleanCode,
            userId,
            generatedJoinCode,
            workingDaysJson,
            dayStartTime || '09:00',
            periodDurationMins || 60,
            periodsPerDay || 6
          );

          if (collegeName) {
            db.prepare(`
              UPDATE college_config SET college_name = ?, updated_at = ? WHERE id = 'default'
            `).run(collegeName.trim(), new Date().toISOString());
          }
        }
      } else if (userRole === 'TEACHER') {
        // Teacher Registration: MUST provide valid facultyJoinCode from an HOD
        if (!facultyJoinCode) {
          res.status(400).json({
            error: 'Faculty Join Code is required to join a department. Please obtain the code from your Department Head.',
          });
          return;
        }

        const cleanJoinCode = facultyJoinCode.trim().toUpperCase();
        const dept = db.prepare('SELECT * FROM departments WHERE faculty_join_code = ?').get(cleanJoinCode) as any;

        if (!dept) {
          res.status(400).json({
            error: `Invalid Faculty Join Code '${cleanJoinCode}'. Please check with your HOD for the verified code.`,
          });
          return;
        }

        assignedDeptId = dept.id;

        // Auto-create teacher record if not already existing
        const tId = teacherId || `t_${crypto.randomUUID().slice(0, 8)}`;
        const shortCode = userName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 3) || 'FAC';

        db.prepare(`
          INSERT OR IGNORE INTO teachers (id, name, short_code, email, department, max_hours_per_day, max_hours_per_week, unavailable_slots, color)
          VALUES (?, ?, ?, ?, ?, 4, 16, '[]', '#6366f1')
        `).run(tId, userName.trim(), shortCode, email.toLowerCase().trim(), dept.name);

        db.prepare(`
          INSERT OR REPLACE INTO teacher_departments (teacher_id, department_id, is_primary)
          VALUES (?, ?, 1)
        `).run(tId, dept.id);
      } else if (userRole === 'STUDENT') {
        // Student picks department + batch dynamically
        if (req.body.departmentId) {
          assignedDeptId = req.body.departmentId;
        }
      }

      const { secret, otpauthUrl } = AuthService.generateTotpSecret(email);
      const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);
      const passwordHash = AuthService.hashPassword(password);
      const now = new Date().toISOString();

      // Student 2FA is optional (user-toggleable); HOD and Teacher mandatory
      const is2faMandatory = userRole !== 'STUDENT' || Boolean(enable2fa);
      const isVerifiedInitially = !is2faMandatory ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, role, name, totp_secret, is_totp_verified, teacher_id, batch_id, department_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        email.toLowerCase().trim(),
        passwordHash,
        userRole,
        userName.trim(),
        secret,
        isVerifiedInitially,
        teacherId || (userRole === 'TEACHER' ? `t_${userId.slice(4, 12)}` : null),
        batchId || null,
        assignedDeptId,
        now
      );

      // Log dev-mode TOTP in terminal only for local testing
      if (is2faMandatory) {
        const devTotp = authenticator.generate(secret);
        console.log(`\n======================================================`);
        console.log(`[AUTH-2FA-TERMINAL] Registered User: ${email} (${userRole})`);
        console.log(`[AUTH-2FA-TERMINAL] Local Test Code: >>> ${devTotp} <<<`);
        console.log(`======================================================\n`);
      }

      // If Student opted out of 2FA, issue full token immediately
      if (!is2faMandatory) {
        const payload: UserPayload = {
          id: userId,
          email: email.toLowerCase().trim(),
          role: 'STUDENT',
          name: userName.trim(),
          batchId: batchId || null,
          departmentId: assignedDeptId || undefined,
        };
        const token = AuthService.signAuthToken(payload);

        res.status(201).json({
          message: 'Student account created and activated successfully.',
          token,
          user: payload,
          requires2fa: false,
        });
        return;
      }

      res.status(201).json({
        message: 'Account created. Scan the QR code with Google Authenticator or any TOTP app, and verify the 6-digit code to activate.',
        userId,
        email: email.toLowerCase().trim(),
        role: userRole,
        manualSetupKey: secret,
        otpauthUrl,
        qrCodeDataUrl,
        facultyJoinCode: generatedJoinCode,
        requires2fa: true,
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
        departmentId: (user as any).department_id || undefined,
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

      let user = AuthService.getUserByEmail(emailOrUser);
      if (!user && !emailOrUser.includes('@')) {
        user = AuthService.getUserByEmail(`${emailOrUser}@schedulo.edu`);
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
          otpauthUrl,
          qrCodeDataUrl,
        });
        return;
      }

      // If Student without mandatory 2FA, log in directly
      if (user.role === 'STUDENT' && req.body.skip2faIfStudent) {
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
          message: 'Student login successful.',
          token,
          user: payload,
          requires2fa: false,
        });
        return;
      }

      // Issue temporary Pre-2FA token (expires in 5 minutes)
      const pre2faToken = AuthService.signPre2faToken(user.id, user.email);

      // Log dev-mode TOTP code in terminal only for local testing
      const devTotp = authenticator.generate(user.totp_secret);
      console.log(`\n======================================================`);
      console.log(`[AUTH-2FA-TERMINAL] Login User: ${user.email} (${user.role})`);
      console.log(`[AUTH-2FA-TERMINAL] Local Test Code: >>> ${devTotp} <<<`);
      console.log(`======================================================\n`);

      res.json({
        message: 'Primary credentials verified. Please enter the 6-digit TOTP code from your Authenticator app.',
        requires2fa: true,
        pre2faToken,
        email: user.email,
        role: user.role,
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
        res.status(400).json({ error: 'Invalid 6-digit TOTP code. Please check your authenticator app.' });
        return;
      }

      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        teacherId: user.teacher_id,
        batchId: user.batch_id,
        departmentId: (user as any).department_id || undefined,
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
        departmentId: (user as any).department_id,
        isTotpVerified: Boolean(user.is_totp_verified),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user' });
    }
  }
}
