import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { seedDatabase } from './db/seeder.js';
import { db } from './db/db.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import entityRoutes from './routes/entity.routes.js';
import alertRoutes from './routes/alert.routes.js';
import { authenticateToken, requireRole } from './auth/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// [M-7] HTTP Security Headers
app.use(helmet({ contentSecurityPolicy: false }));

// [M-27] Dynamic CORS allowlist supporting local dev and deployed client origins
const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:4173'];
const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...localOrigins, ...clientOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// [M-7] Limit JSON request body size to prevent DoS memory exhaustion
app.use(express.json({ limit: '10kb' }));

// [M-2] Global Rate Limiter: 200 req / minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(globalLimiter);

// Initialize Database & Run Seed
seedDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/alerts', alertRoutes);

// Multi-Department & College Config Routes
app.get('/api/departments', (req: Request, res: Response) => {
  try {
    const departments = db.prepare('SELECT * FROM departments').all() as any[];
    const batches = db.prepare('SELECT * FROM batches').all() as any[];
    let configRaw: any = null;
    try {
      configRaw = db.prepare('SELECT * FROM time_slot_config WHERE id = ?').get('default');
    } catch {}
    const collegeName = configRaw?.college_name || 'Apex Institute of Technology & Science';

    res.json({
      collegeName,
      departments: departments.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        batches: batches
          .filter((b: any) => b.department === d.name || b.department === d.code || b.department.includes(d.code))
          .map((b: any) => ({
            id: b.id,
            name: b.name,
            semester: b.semester,
            section: b.name.includes('-') ? b.name.split('-')[1] : 'A',
            studentCount: b.studentCount,
          })),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', authenticateToken, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { name, code, workingDays, startTime, collegeName } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Department name and code are required' });
      return;
    }
    const cleanCode = code.toUpperCase().trim();
    const id = `dept-${cleanCode.toLowerCase()}`;
    db.prepare('INSERT OR REPLACE INTO departments (id, name, code) VALUES (?, ?, ?)').run(id, name.trim(), cleanCode);

    if (collegeName) {
      try {
        db.prepare('UPDATE time_slot_config SET college_name = ? WHERE id = ?').run(collegeName.trim(), 'default');
      } catch {}
    }
    res.json({
      id,
      name,
      code: cleanCode,
      facultyJoinCode: `${cleanCode}-FAC-2026`,
      message: 'Department registered successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config', (req: Request, res: Response) => {
  try {
    const configRaw = db.prepare('SELECT * FROM time_slot_config WHERE id = ?').get('default') as any;
    res.json({
      collegeName: configRaw?.college_name || 'Apex Institute of Technology & Science',
      workingDays: JSON.parse(configRaw?.working_days || '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
      periodsPerDay: configRaw?.periods_per_day || 6,
      periodDurationMinutes: configRaw?.period_duration_minutes || 50,
      startTime: configRaw?.start_time || '09:00',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', authenticateToken, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { collegeName, workingDays, periodsPerDay, periodDurationMinutes, startTime } = req.body;
    if (collegeName) {
      try {
        db.prepare('UPDATE time_slot_config SET college_name = ? WHERE id = ?').run(collegeName.trim(), 'default');
      } catch {}
    }
    if (workingDays || periodsPerDay || startTime) {
      db.prepare(`
        UPDATE time_slot_config SET 
          working_days = COALESCE(?, working_days),
          periods_per_day = COALESCE(?, periods_per_day),
          period_duration_minutes = COALESCE(?, period_duration_minutes),
          start_time = COALESCE(?, start_time)
        WHERE id = ?
      `).run(
        workingDays ? JSON.stringify(workingDays) : null,
        periodsPerDay || null,
        periodDurationMinutes || null,
        startTime || null,
        'default'
      );
    }
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Schedulo Production Backend',
    timestamp: new Date().toISOString(),
    engine: 'Pure Deterministic Backtracking CSP (MRV)',
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Schedulo Production Backend running on port ${PORT}`);
  console.log(`Base URL: http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});

export default app;
