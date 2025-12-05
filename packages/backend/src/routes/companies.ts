import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../lib/db';
import { z } from 'zod';
import { authGuard, memberGuard, roleGuard } from '../middleware/auth';
import { CATEGORIES } from '../lib/categories';
import fs from 'fs';

const router = Router();

// Lista firm z meta (kategoria/opis) + filtrowanie
router.get('/', (req: Request, res: Response) => {
  const { category, q } = req.query as { category?: string; q?: string };

  let sql = `
    SELECT c.id, c.name, c.timezone, c.logoPath,
           m.category, m.description,
           COALESCE(cs.isActive, 1) AS isActive
    FROM companies c
    LEFT JOIN company_meta m ON m.companyId = c.id
    LEFT JOIN company_status cs ON cs.companyId = c.id
  `;
  const where: string[] = [];
  const params: string[] = [];
  if (category) {
    where.push('m.category = ?');
    params.push(String(category));
  }
  if (q) {
    where.push('(c.name LIKE ? OR m.description LIKE ?)');
    params.push(`%${String(q)}%`, `%${String(q)}%`);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY c.id';

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    name: string;
    timezone: string;
    logoPath?: string;
    category?: string;
    description?: string;
    isActive: number;
  }>;
  res.json({ companies: rows });
});

// Lista kategorii (używana w formularzu tworzenia/edycji firmy)
router.get('/categories', (req: Request, res: Response) => {
  res.json({ categories: CATEGORIES });
});

// Firmy, których bieżący użytkownik jest właścicielem (OWNER)
// REMOVED - duplicate endpoint that was hardcoding autoAccept
// Now using the correct endpoint at line ~540


const createCompanySchema = z.object({
  name: z.string().min(2),
  timezone: z.string().default('Europe/Warsaw'),
});

router.post('/', authGuard, roleGuard('PLATFORM_ADMIN'), (req: Request, res: Response) => {
  const parsed = createCompanySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { name, timezone } = parsed.data;
  const info = db
    .prepare('INSERT INTO companies (name, timezone) VALUES (?, ?)')
    .run(name, timezone);
  res.json({ id: info.lastInsertRowid });
});

router.get('/:companyId', (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  const company = db
    .prepare(`
      SELECT c.id, c.name, c.timezone, c.logoPath, c.address, c.phone, c.contactEmail, c.website,
             c.slotMinutes, c.traineeExtraMinutes, c.autoAccept,
             m.category, m.description
      FROM companies c
      LEFT JOIN company_meta m ON m.companyId = c.id
      WHERE c.id = ?
    `)
    .get(companyId) as {
      id: number;
      name: string;
      timezone: string;
      logoPath?: string;
      address?: string;
      phone?: string;
      contactEmail?: string;
      website?: string;
      slotMinutes?: number;
      traineeExtraMinutes?: number;
      autoAccept?: number;
      category?: string;
      description?: string;
    } | undefined;
  if (!company) return res.status(404).json({ error: 'Not found' });

  // Convert autoAccept from SQLite integer to boolean
  const companyWithBoolean = {
    ...company,
    autoAccept: Boolean(company.autoAccept)
  };

  res.json({ company: companyWithBoolean });
});


// Lista kategorii (distinct) z liczbą firm
router.get('/categories/list', (_req: Request, res: Response) => {
  // Aggregate counts of existing categories from DB
  const rows = db
    .prepare(`
      SELECT COALESCE(m.category, 'Inne') AS category, COUNT(1) AS count
      FROM companies c
      LEFT JOIN company_meta m ON m.companyId = c.id
      GROUP BY category
    `)
    .all() as { category: string; count: number }[];

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, r.count);

  // Ensure all platform categories are present with default count 0
  const unified = CATEGORIES.map((cat) => ({ category: cat, count: counts.get(cat) ?? 0 }));

  // Sort by count desc, then alphabetically; always place 'Inne' at the end
  unified.sort((a, b) => {
    if (a.category === 'Inne' && b.category !== 'Inne') return 1;
    if (b.category === 'Inne' && a.category !== 'Inne') return -1;
    const byCount = b.count - a.count;
    if (byCount !== 0) return byCount;
    return a.category.localeCompare(b.category);
  });

  res.json({ categories: unified });
});

// Pracownicy firmy (role=WORKER)
router.get('/:companyId/workers', (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  const rows = db
    .prepare(`
      SELECT u.id, u.email, cm.role, u.canServe, u.isTrainee
      FROM company_members cm
      JOIN users u ON u.id = cm.userId
      WHERE cm.companyId = ? AND cm.role IN ('WORKER', 'OWNER')
      ORDER BY u.email
    `)
    .all(companyId) as Array<{ id: number; email: string; role: 'WORKER' | 'OWNER'; canServe: number; isTrainee: number }>;

  const workers = rows.map(r => ({
    ...r,
    canServe: !!r.canServe,
    isTrainee: !!r.isTrainee
  }));

  res.json({ workers });
});

// Usuń pracownika z firmy (tylko OWNER)
router.delete(
  '/:companyId/workers/:workerId',
  authGuard,
  memberGuard('companyId'),
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const companyId = Number(req.params.companyId);
    const workerId = Number(req.params.workerId);

    // Sprawdź czy pracownik należy do tej firmy i jest WORKERem (nie można usunąć OWNERa tą drogą)
    const member = db.prepare(
      "SELECT role FROM company_members WHERE companyId = ? AND userId = ?"
    ).get(companyId, workerId) as { role: string } | undefined;

    if (!member) {
      return res.status(404).json({ error: 'Pracownik nie znaleziony w tej firmie' });
    }

    if (member.role === 'OWNER') {
      return res.status(400).json({ error: 'Nie można usunąć właściciela' });
    }

    try {
      // Usuń z company_members
      db.prepare('DELETE FROM company_members WHERE companyId = ? AND userId = ?').run(companyId, workerId);

      // Opcjonalnie: Usuń przyszłe zmiany i rezerwacje tego pracownika w tej firmie?
      // Na razie zostawiamy - rezerwacje będą sierotami lub trzeba je obsłużyć.
      // W MVP wystarczy usunięcie dostępu.

      res.json({ success: true });
    } catch (error) {
      console.error('Błąd podczas usuwania pracownika:', error);
      res.status(500).json({ error: 'Błąd serwera' });
    }
  }
);

// Aktualizacja statusu pracownika (canServe, isTrainee) — tylko OWNER
router.put(
  '/:companyId/workers/:workerId',
  authGuard,
  memberGuard('companyId'),
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const companyId = Number(req.params.companyId);
    const workerId = Number(req.params.workerId);
    const { canServe, isTrainee } = req.body;

    // Sprawdź czy pracownik należy do tej firmy
    const member = db.prepare(
      'SELECT userId FROM company_members WHERE companyId = ? AND userId = ?'
    ).get(companyId, workerId);

    if (!member) {
      return res.status(404).json({ error: 'Worker not found in this company' });
    }

    // Aktualizuj pola w tabeli users
    const updates: string[] = [];
    const params: any[] = [];

    if (typeof canServe === 'boolean') {
      updates.push('canServe = ?');
      params.push(canServe ? 1 : 0);
    }

    if (typeof isTrainee === 'boolean') {
      updates.push('isTrainee = ?');
      params.push(isTrainee ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    params.push(workerId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ success: true });
  }
);

// Dodawanie członka firmy (na razie tylko rola WORKER) — tylko OWNER
const addMemberSchema = z.object({
  email: z.string().email('Nieprawidłowy e-mail'),
  role: z.literal('WORKER').default('WORKER'),
});

router.post(
  '/:companyId/members',
  authGuard,
  memberGuard('companyId'),
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const companyId = Number(req.params.companyId);
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Błędy walidacji', details: parsed.error.flatten() });
    }
    const { email, role } = parsed.data;

    // Znajdź użytkownika po e-mailu
    const user = db
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .get(email) as { id: number; email: string } | undefined;
    if (!user) return res.status(404).json({ error: 'Użytkownik o podanym e-mailu nie istnieje' });

    // Dodaj członka firmy (unikalne wstawienie)
    try {
      db.transaction(() => {
        db
          .prepare(
            'INSERT OR IGNORE INTO company_members (companyId, userId, role) VALUES (?, ?, ?)'
          )
          .run(companyId, user.id, role);

        // Automatycznie przypisz wszystkie aktywne usługi firmy do nowego pracownika
        const services = db.prepare('SELECT id FROM services WHERE companyId = ? AND isActive = 1').all(companyId) as { id: number }[];
        const insertService = db.prepare('INSERT OR IGNORE INTO worker_services (workerId, serviceId, canPerform) VALUES (?, ?, 1)');

        for (const service of services) {
          insertService.run(user.id, service.id);
        }
      })();
    } catch (e) {
      console.error('Error adding company member:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Zwróć aktualny stan członkostwa (może już istniał)
    const memberRow = db
      .prepare(
        `SELECT u.id, u.email, cm.role
         FROM company_members cm
         JOIN users u ON u.id = cm.userId
         WHERE cm.companyId = ? AND cm.userId = ?`
      )
      .get(companyId, user.id) as { id: number; email: string; role: 'WORKER' | 'OWNER' } | undefined;

    res.status(201).json({ member: memberRow });
  }
);

// Upload logo przez JSON base64, walidacja MIME/rozmiaru
const logoSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  base64Data: z.string(),
});

router.post('/:companyId/logo', authGuard, memberGuard('companyId'), roleGuard('OWNER'), (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  const parsed = logoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { fileName, mimeType, base64Data } = parsed.data;

  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const buf = Buffer.from(base64Data, 'base64');
  const size = buf.length;
  if (size > 6 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });

  // Validate image dimensions (>=256x256)
  const getPngDimensions = (b: Buffer): { width: number; height: number } | null => {
    // PNG signature check
    if (b.length < 24) return null;
    const signature = b.slice(0, 8);
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!signature.equals(pngSig)) return null;
    // IHDR chunk width/height at fixed offsets
    const width = b.readUInt32BE(16);
    const height = b.readUInt32BE(20);
    return { width, height };
  };

  const getJpegDimensions = (b: Buffer): { width: number; height: number } | null => {
    let i = 0;
    const len = b.length;
    // JPEG starts with 0xFF 0xD8
    if (len < 4 || b[i++] !== 0xff || b[i++] !== 0xd8) return null;
    while (i < len) {
      // Find marker 0xFF
      while (i < len && b[i] !== 0xff) i++;
      if (i >= len) break;
      // Skip FF padding
      while (i < len && b[i] === 0xff) i++;
      const marker = b[i++];
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 contain dimensions
      if (
        marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
        marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
        marker === 0xc9 || marker === 0xca || marker === 0xcb ||
        marker === 0xcd || marker === 0xce || marker === 0xcf
      ) {
        if (i + 7 > len) return null;
        // precision = b[i+2]
        const height = (b[i + 3] << 8) + b[i + 4];
        const width = (b[i + 5] << 8) + b[i + 6];
        return { width, height };
      } else {
        if (i + 1 >= len) return null;
        const segmentLength = (b[i] << 8) + b[i + 1];
        i += segmentLength; // move to next marker
      }
    }
    return null;
  };

  let dims: { width: number; height: number } | null = null;
  if (mimeType === 'image/png') {
    dims = getPngDimensions(buf);
  } else if (mimeType === 'image/jpeg') {
    dims = getJpegDimensions(buf);
  }
  if (!dims) return res.status(400).json({ error: 'Invalid image data' });
  if (dims.width < 256 || dims.height < 256) {
    return res.status(422).json({ error: 'Image dimensions too small (min 256x256)' });
  }

  const ext = mimeType === 'image/png' ? '.png' : '.jpg';
  const uploadsDir = 'uploads/logos';
  const fullDir = `packages/backend/${uploadsDir}`;

  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }

  const filename = `${companyId}-${Date.now()}-${safeName}${ext}`;
  const fullPath = `${fullDir}/${filename}`;
  fs.writeFileSync(fullPath, buf);

  const publicUrl = `/${uploadsDir}/${filename}`;
  db.prepare('UPDATE companies SET logoPath = ? WHERE id = ?').run(publicUrl, companyId);
  res.json({ logoUrl: publicUrl });
});


// Aktualizacja danych firmy
const updateCompanySchema = z.object({
  name: z.string().min(2, 'Nazwa firmy jest wymagana').optional(),
  description: z.string().max(2000, 'Opis nie może przekraczać 2000 znaków').optional(),
  address: z.string().max(500, 'Adres nie może przekraczać 500 znaków').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{6,20}$/, 'Nieprawidłowy format telefonu').optional().or(z.literal('')),
  contactEmail: z.string().email('Nieprawidłowy format email').optional().or(z.literal('')),
  website: z.string().url('Nieprawidłowy format URL').optional().or(z.literal('')),
  category: z.string().optional(),
  slotMinutes: z.number().min(5).max(300).optional(),
  traineeExtraMinutes: z.number().min(0).max(120).optional(),
  autoAccept: z.boolean().optional(),
  workersCanAccept: z.boolean().optional(),
});


router.put('/:companyId',
  authGuard,
  memberGuard('companyId'),
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const companyId = Number(req.params.companyId);
    const parsed = updateCompanySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Błędy walidacji',
        details: parsed.error.flatten()
      });
    }

    const updates = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];

    // Budujemy dynamicznie zapytanie SQL
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.address !== undefined) {
      fields.push('address = ?');
      values.push(updates.address);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.contactEmail !== undefined) {
      fields.push('contactEmail = ?');
      values.push(updates.contactEmail);
    }
    if (updates.website !== undefined) {
      fields.push('website = ?');
      values.push(updates.website || null);
    }
    if (updates.slotMinutes !== undefined) {
      fields.push('slotMinutes = ?');
      values.push(updates.slotMinutes);
    }
    if (updates.traineeExtraMinutes !== undefined) {
      fields.push('traineeExtraMinutes = ?');
      values.push(updates.traineeExtraMinutes);
    }
    if (updates.autoAccept !== undefined) {
      fields.push('autoAccept = ?');
      values.push(updates.autoAccept ? 1 : 0);
    }
    if (updates.workersCanAccept !== undefined) {
      fields.push('workersCanAccept = ?');
      values.push(updates.workersCanAccept ? 1 : 0);
    }

    // Aktualizacja company_meta
    if (updates.description !== undefined || updates.category !== undefined) {
      const metaFields: string[] = [];
      const metaValues: any[] = [];

      if (updates.description !== undefined) {
        metaFields.push('description = ?');
        metaValues.push(updates.description);
      }
      if (updates.category !== undefined) {
        metaFields.push('category = ?');
        metaValues.push(updates.category);
      }

      if (metaFields.length > 0) {
        metaValues.push(companyId);
        db.prepare(`UPDATE company_meta SET ${metaFields.join(', ')} WHERE companyId = ?`).run(...metaValues);
      }
    }

    if (fields.length > 0) {
      values.push(companyId);
      db.prepare(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    // Pobierz zaktualizowane dane
    const updatedCompany = db.prepare(`
      SELECT c.id, c.name, c.timezone, c.logoPath, c.address, c.phone, c.contactEmail, c.website,
             c.slotMinutes, c.traineeExtraMinutes, c.autoAccept, c.workersCanAccept,
             m.category, m.description
      FROM companies c
      LEFT JOIN company_meta m ON m.companyId = c.id
      WHERE c.id = ?
    `).get(companyId);

    res.json({ company: updatedCompany, message: 'Ustawienia firmy zaktualizowane' });
  }
);

// Pobierz firmy właściciela
router.get('/owner/companies', authGuard, (req: Request, res: Response) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Nieautoryzowany' });
  }

  const companies = db.prepare(`
    SELECT c.id, c.name, c.timezone, c.logoPath, c.slotMinutes, c.traineeExtraMinutes, c.autoAccept, c.workersCanAccept,
           m.category, m.description, c.address, c.phone, c.contactEmail, c.website
    FROM companies c
    JOIN company_members cm ON cm.companyId = c.id
    LEFT JOIN company_meta m ON m.companyId = c.id
    WHERE cm.userId = ? AND cm.role = 'OWNER'
    ORDER BY c.name
  `).all(userId);

  res.json({ companies });
});

// Statystyki firmy
router.get('/:companyId/stats', authGuard, memberGuard('companyId'), (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);

  // Dzisiejsze rezerwacje
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = db.prepare(`
    SELECT COUNT(*) as count, SUM(price) as revenue
    FROM reservations r
    JOIN services s ON r.serviceId = s.id
    WHERE r.companyId = ? AND r.date = ? AND r.status IN ('ACCEPTED', 'DONE')
  `).get(companyId, today) as { count: number; revenue: number };

  // Aktywni pracownicy
  const activeWorkers = db.prepare(`
    SELECT COUNT(*) as count
    FROM company_members
    WHERE companyId = ? AND role = 'WORKER'
  `).get(companyId) as { count: number };

  // Trend tygodniowy (porównanie z poprzednim tygodniem)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  const lastWeekReservations = db.prepare(`
    SELECT COUNT(*) as count
    FROM reservations
    WHERE companyId = ? AND date >= ? AND date < ? AND status IN ('ACCEPTED', 'DONE')
  `).get(companyId, lastWeekStr, today) as { count: number };

  const thisWeekReservations = db.prepare(`
    SELECT COUNT(*) as count
    FROM reservations
    WHERE companyId = ? AND date >= ? AND status IN ('ACCEPTED', 'DONE')
  `).get(companyId, lastWeekStr) as { count: number };

  let weeklyTrend = 0;
  if (lastWeekReservations.count > 0) {
    weeklyTrend = Math.round(((thisWeekReservations.count - lastWeekReservations.count) / lastWeekReservations.count) * 100);
  }

  res.json({
    stats: {
      todayReservations: todayReservations.count || 0,
      totalRevenue: todayReservations.revenue || 0,
      activeWorkers: activeWorkers.count || 0,
      weeklyTrend: weeklyTrend
    }
  });
});

export default router;
