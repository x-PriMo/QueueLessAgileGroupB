import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import db from '../lib/db';
import { authGuard, roleGuard } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Prekonfigurowany guard dla roli administratora platformy
const requirePlatformAdmin: RequestHandler = roleGuard('PLATFORM_ADMIN');

// Lista użytkowników z soft statusem (PLATFORM_ADMIN)
router.get('/users', authGuard, requirePlatformAdmin, (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.role, COALESCE(us.isActive, 1) AS isActive,
              datetime('now') AS createdAt
       FROM users u
       LEFT JOIN user_status us ON us.userId = u.id
       ORDER BY u.id`
    )
    .all();
  res.json({ users: rows });
});

// Soft toggle firmy (PLATFORM_ADMIN)
router.post(
  '/companies/:companyId/toggle',
  authGuard,
  requirePlatformAdmin,
  (req: Request<{ companyId: string }>, res: Response) => {
  const companyId = parseInt(req.params.companyId, 10);
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'Invalid isActive' });

  db
    .prepare(
      `INSERT INTO company_status (companyId, isActive) VALUES (?, ?)
       ON CONFLICT(companyId) DO UPDATE SET isActive = excluded.isActive`
    )
    .run(companyId, isActive ? 1 : 0);

  res.json({ ok: true, companyId, isActive });
}
);

// Soft toggle użytkownika (PLATFORM_ADMIN)
router.post(
  '/users/:userId/toggle',
  authGuard,
  requirePlatformAdmin,
  (req: Request<{ userId: string }>, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'Invalid isActive' });

  db
    .prepare(
      `INSERT INTO user_status (userId, isActive) VALUES (?, ?)
       ON CONFLICT(userId) DO UPDATE SET isActive = excluded.isActive`
    )
    .run(userId, isActive ? 1 : 0);

  res.json({ ok: true, userId, isActive });
}
);

// Przypisz właściciela (OWNER) do firmy po e-mailu — tylko PLATFORM_ADMIN
const assignOwnerSchema = z.object({
  email: z.string().email('Nieprawidłowy e-mail'),
});

router.post(
  '/companies/:companyId/assign-owner',
  authGuard,
  requirePlatformAdmin,
  (req: Request<{ companyId: string }>, res: Response) => {
  const companyId = parseInt(req.params.companyId, 10);
  const parsed = assignOwnerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Błędy walidacji', details: parsed.error.flatten() });
  }
  const { email } = parsed.data;

  if (Number.isNaN(companyId) || companyId <= 0) {
    return res.status(400).json({ error: 'Invalid companyId' });
  }

  // Upewnij się, że firma istnieje
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId) as { id: number } | undefined;
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Znajdź użytkownika po e-mailu
  const user = db
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .get(email) as { id: number; email: string } | undefined;
  if (!user) {
    return res.status(404).json({ error: 'User not found by email' });
  }

  try {
    // Upsert członkostwa do roli OWNER
    db
      .prepare(
        `INSERT INTO company_members (companyId, userId, role)
         VALUES (?, ?, 'OWNER')
         ON CONFLICT(companyId, userId) DO UPDATE SET role = 'OWNER'`
      )
      .run(companyId, user.id);
  } catch (e) {
    console.error('Assign OWNER error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Zwróć bieżący stan członkostwa
  const member = db
    .prepare(
      `SELECT u.id, u.email, cm.role
       FROM company_members cm
       JOIN users u ON u.id = cm.userId
       WHERE cm.companyId = ? AND cm.userId = ?`
    )
    .get(companyId, user.id) as { id: number; email: string; role: 'OWNER' | 'WORKER' } | undefined;

  res.json({ member });
}
);

// Lista firm bez przypisanego właściciela (OWNER)
router.get('/companies/missing-owners', authGuard, requirePlatformAdmin, (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.timezone
       FROM companies c
       LEFT JOIN company_members cm ON cm.companyId = c.id AND cm.role = 'OWNER'
       WHERE cm.userId IS NULL
       ORDER BY c.id`
    )
    .all() as Array<{ id: number; name: string; timezone: string }>;
  res.json({ companies: rows });
});

// Spróbuj automatycznie przypisać OWNER na podstawie zaakceptowanych zgłoszeń
// Heurystyka: dopasowanie po nazwie firmy; jeśli userId istnieje — użyj go; w przeciwnym razie contactEmail
router.post('/companies/assign-owners-from-requests', authGuard, requirePlatformAdmin, (_req: Request, res: Response) => {
  // Pobierz firmy bez OWNER
  const companies = db
    .prepare(
      `SELECT c.id, c.name
       FROM companies c
       LEFT JOIN company_members cm ON cm.companyId = c.id AND cm.role = 'OWNER'
       WHERE cm.userId IS NULL`
    )
    .all() as Array<{ id: number; name: string }>;

  const assigned: Array<{ companyId: number; userId?: number; email?: string; status: 'ASSIGNED' | 'SKIPPED' | 'NOT_FOUND' }> = [];

  for (const c of companies) {
    const reqRow = db
      .prepare(
        `SELECT id, userId, contactEmail
         FROM company_requests
         WHERE companyName = ? AND status = 'APPROVED'
         ORDER BY id DESC`
      )
      .get(c.name) as { id: number; userId: number | null; contactEmail: string } | undefined;

    if (!reqRow) {
      assigned.push({ companyId: c.id, status: 'NOT_FOUND' });
      continue;
    }

    let user: { id: number; email: string } | undefined;
    if (reqRow.userId) {
      user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(reqRow.userId) as { id: number; email: string } | undefined;
    }
    if (!user) {
      user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(reqRow.contactEmail) as { id: number; email: string } | undefined;
    }

    if (!user) {
      assigned.push({ companyId: c.id, status: 'SKIPPED' });
      continue;
    }

    try {
      db
        .prepare(
          `INSERT INTO company_members (companyId, userId, role)
           VALUES (?, ?, 'OWNER')
           ON CONFLICT(companyId, userId) DO UPDATE SET role = 'OWNER'`
        )
        .run(c.id, user.id);
      assigned.push({ companyId: c.id, userId: user.id, email: user.email, status: 'ASSIGNED' });
    } catch (e) {
      console.error('Auto-assign OWNER error:', e);
      assigned.push({ companyId: c.id, userId: user.id, email: user.email, status: 'SKIPPED' });
    }
  }

  res.json({ results: assigned });
});

export default router;
