// Test setup file
import { beforeAll, afterEach, afterAll } from '@jest/globals';
import db from '../src/lib/db';
import { resetRateLimitStore } from '../src/middleware/rateLimit';
import fs from 'fs';
import path from 'path';

beforeAll(() => {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Run migrations
  let migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const candidate1 = path.join(process.cwd(), 'packages', 'backend', 'db', 'migrations');
  const candidate2 = path.join(process.cwd(), 'db', 'migrations');
  if (fs.existsSync(candidate1)) migrationsDir = candidate1;
  else if (fs.existsSync(candidate2)) migrationsDir = candidate2;
  
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
  }
  console.log('Test migrations applied:', files);
});

afterEach(() => {
  // Clean up test data after each test
  const tables = [
    'reservations',
    'shifts', 
    'breaks',
    'company_members',
    'companies',
    'users'
  ];
  
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  // Reset rate limit counters between tests
  resetRateLimitStore();
});

afterAll(() => {
  // Close database connection
  db.close();
});
