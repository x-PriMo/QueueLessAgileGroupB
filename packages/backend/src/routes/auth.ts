import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import db from '../lib/db';
import { loginRateLimit } from '../middleware/rateLimit';

const router = Router();

// Helper: compute effective role based on memberships
function computeEffectiveRole(userId: number, baseRole: string): 'USER' | 'WORKER' | 'OWNER' | 'PLATFORM_ADMIN' {
  // PLATFORM_ADMIN remains global regardless of memberships
  if (baseRole === 'PLATFORM_ADMIN') return 'PLATFORM_ADMIN';

  try {
    // Owner has precedence over Worker
    const ownerExists = db
      .prepare('SELECT 1 FROM company_members WHERE userId = ? AND role = \'OWNER\' LIMIT 1')
      .get(userId) as { 1?: number } | undefined;
    if (ownerExists) return 'OWNER';

    const workerExists = db
      .prepare('SELECT 1 FROM company_members WHERE userId = ? AND role = \'WORKER\' LIMIT 1')
      .get(userId) as { 1?: number } | undefined;
    if (workerExists) return 'WORKER';
  } catch (e) {
    // In case of any DB error, fallback to base role
    console.error('computeEffectiveRole error:', e);
  }

  return 'USER';
}

// Enhanced validation schemas
const registerSchema = z.object({
  email: z.string()
    .min(1, 'E-mail jest wymagany')
    .email('Nieprawidłowy format adresu e-mail')
    .max(255, 'E-mail jest zbyt długi'),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .max(128, 'Hasło jest zbyt długie')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę i jedną cyfrę')
});

const loginSchema = z.object({
  email: z.string()
    .min(1, 'E-mail jest wymagany')
    .email('Nieprawidłowy format adresu e-mail'),
  password: z.string()
    .min(1, 'Hasło jest wymagane')
});

// Helper function to format validation errors
const formatValidationErrors = (error: z.ZodError) => {
  return error.errors.map(err => ({
    field: err.path[0] as string,
    message: err.message
  }));
};

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Błędy walidacji',
        details: formatValidationErrors(validationResult.error)
      });
    }

    const { email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Użytkownik z tym adresem e-mail już istnieje',
        field: 'email'
      });
    }

    // Hash password with increased rounds for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, passwordHash, role)
      VALUES (?, ?, 'USER')
    `).run(email, hashedPassword);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Konto zostało utworzone pomyślnie'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Wystąpił błąd serwera podczas rejestracji',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Login endpoint
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Błędy walidacji',
        details: formatValidationErrors(validationResult.error)
      });
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const user = db.prepare(`
      SELECT id, email, passwordHash, role
      FROM users 
      WHERE email = ?
    `).get(email) as { id: number; email: string; passwordHash: string; role: string } | undefined;

    if (!user) {
      return res.status(401).json({
        error: 'Nieprawidłowy adres e-mail lub hasło',
        field: 'credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Nieprawidłowy adres e-mail lub hasło',
        field: 'credentials'
      });
    }

    // Set session to expected shape for auth guards (do not override base role)
    req.session.user = { id: user.id, email: user.email, role: user.role };

    // Compute effective role for UI (OWNER/WORKER when applicable)
    const effectiveRole = computeEffectiveRole(user.id, user.role);
    const userWithoutPassword = { id: user.id, email: user.email, role: effectiveRole };
    res.json({
      user: userWithoutPassword,
      message: 'Zalogowano pomyślnie'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Wystąpił błąd serwera podczas logowania'
    });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          error: 'Błąd podczas wylogowywania'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        ok: true,
        message: 'Wylogowano pomyślnie'
      });
    });
  } else {
    res.json({
      message: 'Nie jesteś zalogowany'
    });
  }
});

// Get current user endpoint
router.get('/me', (req: Request, res: Response) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.json({ user: null });
  }

  try {
    const userRow = db.prepare(`
      SELECT id, email, role
      FROM users 
      WHERE id = ?
    `).get(sessionUser.id) as { id: number; email: string; role: string } | undefined;

    if (!userRow) {
      return res.json({ user: null });
    }

    const effectiveRole = computeEffectiveRole(userRow.id, userRow.role);
    res.json({ user: { id: userRow.id, email: userRow.email, role: effectiveRole } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Wystąpił błąd serwera'
    });
  }
});

export default router;
