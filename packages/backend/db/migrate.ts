import fs from 'fs';
import path from 'path';
import db from '../src/lib/db';

let migrationsDir = path.join(__dirname, 'migrations');
const candidate1 = path.join(process.cwd(), 'packages', 'backend', 'db', 'migrations');
const candidate2 = path.join(process.cwd(), 'db', 'migrations');
if (fs.existsSync(candidate1)) migrationsDir = candidate1;
else if (fs.existsSync(candidate2)) migrationsDir = candidate2;
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
}
console.log('Migrations applied:', files);
