import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../db/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'schedulo-super-secret-jwt-key-2026';
export const PRE_2FA_SECRET = process.env.PRE_2FA_SECRET || 'schedulo-pre-2fa-temp-secret-key-2026';

// Configure authenticator options
authenticator.options = {
  window: 1, // Allow 1 step before / after for clock drift (RFC-6238)
  step: 30,
  digits: 6,
};

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  totp_secret: string;
  is_totp_verified: number;
  teacher_id?: string | null;
  batch_id?: string | null;
  department_id?: string | null;
  created_at: string;
}

export interface UserPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  teacherId?: string | null;
  batchId?: string | null;
  departmentId?: string | null;
}

export class AuthService {
  static hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  static verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  static generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'Schedulo', secret);
    return { secret, otpauthUrl };
  }

  static async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
    });
  }

  static verifyTotp(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch {
      return false;
    }
  }

  static signPre2faToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'PRE_2FA' },
      PRE_2FA_SECRET,
      { expiresIn: '5m' }
    );
  }

  static verifyPre2faToken(token: string): { userId: string; email: string } {
    const decoded = jwt.verify(token, PRE_2FA_SECRET) as any;
    if (decoded.type !== 'PRE_2FA') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId, email: decoded.email };
  }

  static signAuthToken(payload: UserPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  static verifyAuthToken(token: string): UserPayload {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  }

  static getUserByEmail(email: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    return stmt.get(email) as UserRow | undefined;
  }

  static getUserById(id: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserRow | undefined;
  }
}
