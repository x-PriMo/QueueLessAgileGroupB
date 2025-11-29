-- Create table for company join requests
CREATE TABLE IF NOT EXISTS company_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NULL,
  contactEmail TEXT NOT NULL,
  companyName TEXT NOT NULL,
  description TEXT DEFAULT '',
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_company_requests_status ON company_requests(status);
CREATE INDEX IF NOT EXISTS idx_company_requests_user ON company_requests(userId);


