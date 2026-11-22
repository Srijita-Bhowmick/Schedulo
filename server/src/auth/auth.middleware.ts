import { Request, Response, NextFunction } from 'express';
import { AuthService, UserPayload } from './auth.service.js';
import { db } from '../db/db.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
    return;
  }

  try {
    const user = AuthService.verifyAuthToken(token);
    // [M-5] Prevent Stale Revoked Sessions: verify user still exists in SQLite
    const dbUser = db.prepare('SELECT id, role, department_id FROM users WHERE id = ?').get(user.id);
    if (!dbUser) {
      res.status(401).json({ error: 'Unauthorized: User account no longer exists' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
