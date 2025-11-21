import db from '../src/lib/db';
import { DateTime } from 'luxon';
import bcrypt from 'bcrypt';

type IdRow = { id: number };

function ensureAdmin() {
  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@queueless.local');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, passwordHash, role) VALUES (?, ?, ?)').run('admin@queueless.local', hash, 'PLATFORM_ADMIN');
    console.log('Seed: admin user created (admin@queueless.local / admin123)');
  }
}

function ensureDemoCompany() {
  const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('Demo Salon');
  let companyId: number;
  if (!company) {
    const info = db.prepare('INSERT INTO companies (name, timezone) VALUES (?, ?)').run('Demo Salon', 'Europe/Warsaw');
    companyId = Number(info.lastInsertRowid);
    // Meta: kategoria i opis
    db.prepare('INSERT OR REPLACE INTO company_meta (companyId, category, description) VALUES (?, ?, ?)')
      .run(
        companyId,
        'Salon fryzjerski',
        'Warszawa, ul. Prosta 51 — Profesjonalny salon fryzjerski: strzyżenie, koloryzacja, stylizacja.'
      );
    const ownerUser = db.prepare('SELECT id FROM users WHERE email = ?').get('owner@queueless.local');
    let ownerId: number;
    if (!ownerUser) {
      const hash = bcrypt.hashSync('owner123', 10);
      const infoU = db.prepare('INSERT INTO users (email, passwordHash, role) VALUES (?, ?, ?)').run('owner@queueless.local', hash, 'OWNER');
      ownerId = Number(infoU.lastInsertRowid);
    } else {
      ownerId = Number((ownerUser as IdRow).id);
    }
    db.prepare('INSERT OR IGNORE INTO company_members (companyId, userId, role) VALUES (?, ?, ?)').run(companyId, ownerId, 'OWNER');
  } else {
    companyId = Number((company as IdRow).id);
    // Upewnij się, że meta istnieje
    const meta = db.prepare('SELECT companyId FROM company_meta WHERE companyId = ?').get(companyId);
    if (!meta) {
      db.prepare('INSERT INTO company_meta (companyId, category, description) VALUES (?, ?, ?)')
        .run(
          companyId,
          'Salon fryzjerski',
          'Warszawa, ul. Prosta 51 — Profesjonalny salon fryzjerski: strzyżenie, koloryzacja, stylizacja.'
        );
    } else {
      // Ujednolicenie kategorii na potrzeby taksonomii
      db.prepare('UPDATE company_meta SET category = ?, description = ? WHERE companyId = ?')
        .run(
          'Salon fryzjerski',
          'Warszawa, ul. Prosta 51 — Profesjonalny salon fryzjerski: strzyżenie, koloryzacja, stylizacja.',
          companyId
        );
    }
  }

  // Shift na jutro
  const tomorrow = DateTime.now().setZone('Europe/Warsaw').plus({ days: 1 }).toFormat('yyyy-LL-dd');
  const existingShift = db.prepare('SELECT id FROM shifts WHERE companyId = ? AND date = ?').get(companyId, tomorrow);
  if (!existingShift) {
    db.prepare('INSERT INTO shifts (companyId, date, startTime, endTime) VALUES (?, ?, ?, ?)').run(companyId, tomorrow, '09:00', '17:00');
  }
}

ensureAdmin();
ensureDemoCompany();
console.log('Seed data ensured.');
