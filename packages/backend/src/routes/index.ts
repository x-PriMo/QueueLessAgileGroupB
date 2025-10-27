import { Router } from 'express';
import authRoutes from './auth';
import companyRoutes from './companies';
import companyRegistrationRoutes from './companyRegistrations';
import reservationRoutes from './reservations';
import queueRoutes from './queue';
import shiftRoutes from './shifts';
import adminRoutes from './admin';

const router = Router();

// Montowanie tras API
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/company-registrations', companyRegistrationRoutes);
router.use('/reservations', reservationRoutes);
router.use('/queue', queueRoutes);
router.use('/shifts', shiftRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'QueueLess API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Multi-tenant reservation and queue management platform',
    endpoints: {
      auth: '/api/auth',
      companies: '/api/companies',
      companyRegistrations: '/api/company-registrations',
      reservations: '/api/reservations',
      queue: '/api/queue',
      shifts: '/api/shifts',
      admin: '/api/admin',
      health: '/api/health',
    },
    documentation: '/api/docs',
  });
});

export default router;