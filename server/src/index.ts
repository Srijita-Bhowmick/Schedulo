import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { seedDatabase } from './db/seeder.js';
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
