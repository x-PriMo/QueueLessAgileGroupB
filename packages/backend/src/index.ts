import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import adminRoutes from './routes/admin';
import companyRequestsRoutes from './routes/companyRequests';
import reservationRoutes from './routes/reservations';
import workingHoursRoutes from './routes/workingHours';
import servicesRoutes from './routes/services';
import workerRoutes from './routes/worker';
import queueRoutes from './routes/queue';
import { errorHandler } from './middleware/error';
import db from './lib/db';

// Migracje/seed uruchamiane osobno przez skrypty npm w dev

const app = express();

// Zezwól na wczytywanie zasobów (np. obrazów) z innego originu przez frontend
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '8mb' }));

// Middleware do logowania wszystkich żądań
app.use((req: any, _res: any, next: any) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax', secure: false },
  }) as any
);

// Serwuj uploady logo
const uploadsDir = path.join(process.cwd(), 'packages', 'backend', 'uploads', 'logos');
app.use('/uploads/logos', express.static(uploadsDir));
// Statyczne materiały referencyjne (logo projektu) z folderu Zajecia3
const staticDir = path.join(process.cwd(), '..', '..', 'Zajecia3');
app.use('/static', express.static(staticDir));

// Health check
app.get('/health', (_req: any, res: any) => res.json({ ok: true }));

// Rate-limit dla loginu przeniesiony do routera /auth

app.use('/auth', authRoutes);
app.use('/companies', companyRoutes);
app.use('/admin', adminRoutes);
app.use('/company-requests', companyRequestsRoutes);
app.use('/reservations', reservationRoutes);
app.use('/working-hours', workingHoursRoutes);
app.use('/services', servicesRoutes);
app.use('/worker', workerRoutes);
app.use('/queue', queueRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT || 3001);

// Eksportuj aplikację dla testów
export default app;

// Uruchom serwer tylko jeśli nie jest to import w testach
if (require.main === module) {
  app.listen(PORT, () => {
    // Tworzenie indeksów idempotentnie w razie braku migracji
    try {
      db.prepare('PRAGMA foreign_keys = ON').run();
    } catch (err) {
      console.warn('Failed to enable PRAGMA foreign_keys', err);
    }
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}
