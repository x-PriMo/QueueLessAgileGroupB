-- Idempotentne tworzenie schematu
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('USER','WORKER','OWNER','PLATFORM_ADMIN'))
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  logoPath TEXT
);

CREATE TABLE IF NOT EXISTS company_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('WORKER','OWNER')),
  UNIQUE(companyId, userId),
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  startTime TEXT NOT NULL, -- HH:mm
  endTime TEXT NOT NULL, -- HH:mm
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS breaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shiftId INTEGER NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  FOREIGN KEY(shiftId) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACCEPTED','CANCELLED')),
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indeksy zgodnie z wymaganiami
CREATE INDEX IF NOT EXISTS idx_reservation_company_date_start ON reservations(companyId, date, startTime);
CREATE INDEX IF NOT EXISTS idx_shift_company_date ON shifts(companyId, date);

