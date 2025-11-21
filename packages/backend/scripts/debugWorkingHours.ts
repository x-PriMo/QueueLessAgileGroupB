import request from 'supertest';
import app from '../src/index';
import db from '../src/lib/db';
import bcrypt from 'bcrypt';

async function main() {
  // Clean tables
  db.prepare('DELETE FROM reservations').run();
  db.prepare('DELETE FROM shifts').run();
  db.prepare('DELETE FROM breaks').run();
  db.prepare('DELETE FROM company_members').run();
  db.prepare('DELETE FROM companies').run();
  db.prepare('DELETE FROM users').run();

  // Create company
  const company = db.prepare(`
    INSERT INTO companies (name, timezone)
    VALUES ('Debug Co', 'Europe/Warsaw')
  `).run();
  const companyId = Number(company.lastInsertRowid);
  console.log('CompanyId', companyId);

  // Create owner user
  const passwordHash = await bcrypt.hash('password123', 10);
  const owner = db.prepare(`
    INSERT INTO users (email, passwordHash, role)
    VALUES ('owner@debug.test', ?, 'OWNER')
  `).run(passwordHash);
  const ownerId = Number(owner.lastInsertRowid);
  console.log('OwnerId', ownerId);

  // Add membership
  db.prepare(`
    INSERT INTO company_members (companyId, userId, role)
    VALUES (?, ?, 'OWNER')
  `).run(companyId, ownerId);

  // Login
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'owner@debug.test', password: 'password123' });
  console.log('Login status', loginRes.status, loginRes.body);
  const cookie = loginRes.headers['set-cookie']?.[0];
  console.log('Cookie', cookie);

  // Call POST working hours
  const body = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true };
  const postRes = await request(app)
    .post(`/working-hours/company/${companyId}`)
    .set('Cookie', cookie || '')
    .send(body);
  console.log('POST status', postRes.status);
  console.log('POST body', postRes.body);
}

main().catch((e) => {
  console.error('Debug script error', e);
  process.exit(1);
});

