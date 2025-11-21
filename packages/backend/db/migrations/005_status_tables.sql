-- Tabele statusów dla miękkiej aktywacji/dezaktywacji (soft ban)
-- Idempotentne: CREATE TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS company_status (
  companyId INTEGER PRIMARY KEY,
  isActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_status (
  userId INTEGER PRIMARY KEY,
  isActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

