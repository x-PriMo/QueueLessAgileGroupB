import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import db from '../lib/db';
import { authGuard, roleGuard } from '../middleware/auth';
// import { CATEGORIES } from '../lib/categories';

const router = Router();

const requestSchema = z.object({
  companyName: z.string().min(2, 'Nazwa firmy jest wymagana'),
  description: z.string().max(2000).optional().default(''),
  address: z.string().min(5, 'Adres jest wymagany'),
  category: z.string().optional().default('Inne'),
  contactEmail: z.string().email('Nieprawidłowy e-mail kontaktowy'),
});

// Zgłoszenie utworzenia firmy przez zalogowanego użytkownika
router.post('/', authGuard, (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Błędy walidacji', details: parsed.error.flatten() });
  }

  const { companyName, description, contactEmail, address, category } = parsed.data;
  const userId = req.session?.user?.id ?? null;

  // Wymaganie: w zgłoszeniu nie ma strefy czasowej — zapisujemy domyślną
  const timezone = 'Europe/Warsaw';
  const fullDescription = `Adres: ${address}\nKategoria: ${category}\n${description ?? ''}`.trim();

  const info = db
    .prepare(
      `INSERT INTO company_requests (userId, contactEmail, companyName, description, timezone, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`
    )
    .run(userId, contactEmail, companyName, fullDescription, timezone);

  res.status(201).json({ id: info.lastInsertRowid, message: 'Zgłoszenie zostało przyjęte. Administrator skontaktuje się.' });
});

// Podgląd zgłoszeń (tylko dla administratora platformy)
router.get('/', authGuard, roleGuard('PLATFORM_ADMIN'), (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.contactEmail, r.companyName, r.description, r.timezone, r.status, r.createdAt, r.userId,
              u.email AS userEmail
       FROM company_requests r
       LEFT JOIN users u ON u.id = r.userId
       ORDER BY r.createdAt DESC`
    )
    .all();
  res.json({ requests: rows });
});

// Zatwierdzenie zgłoszenia i utworzenie firmy (PLATFORM_ADMIN)
router.post('/:id/approve', authGuard, roleGuard('PLATFORM_ADMIN'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const reqRow = db
    .prepare(
      `SELECT id, userId, companyName, description, contactEmail FROM company_requests WHERE id = ? AND status = 'PENDING'`
    )
    .get(id) as { id: number; userId: number | null; companyName: string; description?: string; contactEmail: string } | undefined;
  if (!reqRow) return res.status(404).json({ error: 'Zgłoszenie nie istnieje lub już przetworzone' });

  // Wyciągnij kategorię z opisu (jeśli istnieje), domyślnie 'Inne'
  const matchCat = String(reqRow.description || '').match(/Kategoria:\s*(.+)/);
  const category = matchCat?.[1]?.trim() || 'Inne';

  // Utwórz firmę z domyślną strefą czasową
  const companyInfo = db
    .prepare('INSERT INTO companies (name, timezone) VALUES (?, ?)')
    .run(reqRow.companyName, 'Europe/Warsaw');
  const companyId = Number(companyInfo.lastInsertRowid);

  // Zapisz meta: kategoria + opis (w opisie pozostawiamy pełny opis wraz z adresem)
  db
    .prepare('INSERT INTO company_meta (companyId, category, description) VALUES (?, ?, ?)')
    .run(companyId, category, reqRow.description || '');

  // Ustal właściciela: preferuj userId, w przeciwnym razie spróbuj po contactEmail
  try {
    let ownerUserId: number | null = reqRow.userId ?? null;
    if (!ownerUserId) {
      const user = db
        .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
        .get(reqRow.contactEmail) as { id: number } | undefined;
      ownerUserId = user?.id ?? null;
    }

    if (ownerUserId) {
      db
        .prepare(
          `INSERT INTO company_members (companyId, userId, role)
           VALUES (?, ?, 'OWNER')
           ON CONFLICT(companyId, userId) DO UPDATE SET role = 'OWNER'`
        )
        .run(companyId, ownerUserId);
    }
  } catch (e) {
    console.error('Error assigning OWNER:', e);
  }

  // Oznacz zgłoszenie jako APPROVED
  db.prepare("UPDATE company_requests SET status = 'APPROVED' WHERE id = ?").run(id);

  res.json({ message: 'Firma utworzona', companyId });
});

// Odrzucenie zgłoszenia (PLATFORM_ADMIN)
router.post('/:id/decline', authGuard, roleGuard('PLATFORM_ADMIN'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const exists = db
    .prepare('SELECT id FROM company_requests WHERE id = ? AND status = "PENDING"')
    .get(id) as { id: number } | undefined;
  if (!exists) return res.status(404).json({ error: 'Zgłoszenie nie istnieje lub już przetworzone' });
  db.prepare('UPDATE company_requests SET status = "REJECTED" WHERE id = ?').run(id);
  res.json({ message: 'Zgłoszenie odrzucone' });
});

export default router;
