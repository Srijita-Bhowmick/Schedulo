import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { seedDatabase } from './db/seeder.js';
import { db } from './db/db.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import entityRoutes from './routes/entity.routes.js';
import alertRoutes from './routes/alert.routes.js';
import { authenticator } from 'otplib';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for seamless Vite frontend connection
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:4173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

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
        facultyJoinCode: `${d.code}-FAC-2026`,
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

app.post('/api/departments', (req: Request, res: Response) => {
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

app.put('/api/config', (req: Request, res: Response) => {
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

// Helper for testing/dev: Generate current TOTP code for a secret
app.get('/api/auth/dev-totp/:secret', (req: Request, res: Response) => {
  try {
    const { secret } = req.params;
    const token = authenticator.generate(secret);
    const timeRemaining = 30 - Math.floor((Date.now() / 1000) % 30);
    res.json({ secret, token, timeRemaining });
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid secret format' });
  }
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
