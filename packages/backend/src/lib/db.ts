import Database from 'better-sqlite3';
import path from 'path';

// Ustal ścieżkę bazy danych względem pakietu backend,
// niezależnie od katalogu roboczego procesu (npm workspaces).
const dbPath = path.resolve(__dirname, '../../queueless.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export default db;
