import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { prisma } from './lib/prisma';
import { loadUserSession } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import reservationRoutes from './routes/reservations';
import queueRoutes from './routes/queue';
import adminRoutes from './routes/admin';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration - NAPRAWIONE: Dodano walidację origin
const allowedOrigins = [
  process.env.FRONTEND_URL || '',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean); // Usuń puste stringi

app.use(cors({
  origin: (origin, callback) => {
    // NAPRAWIONE: Nie pozwalaj na requesty bez origin w produkcji
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS - missing origin'));
    }
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically (logos, attachments)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// NAPRAWIONE: Bezpieczna konfiguracja sesji
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required in environment variables');
  process.exit(1);
}

// Session configuration
app.use(session({
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  secret: process.env.SESSION_SECRET, // NAPRAWIONE: Wymagaj SESSION_SECRET
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(
    prisma,
    {
      checkPeriod: 2 * 60 * 1000, // 2 minutes
      dbRecordIdIsSessionId: true,
    }
  ),
}));

// Populate req.user from session for downstream middlewares
app.use(loadUserSession);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// NAPRAWIONE: Lepsza obsługa błędów z logowaniem
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log błędu z kontekstem
  console.error('Application Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
  });
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON',
      code: 'INVALID_JSON'
    });
  }
  
  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }
  
  return res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND'
  });
});

export default app;