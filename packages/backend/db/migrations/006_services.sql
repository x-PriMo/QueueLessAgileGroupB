-- Tabela usług firmowych
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  name TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL CHECK (durationMinutes > 0),
  price DECIMAL(10,2) DEFAULT 0.00,
  description TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indeks dla wyszukiwania usług po firmie
CREATE INDEX IF NOT EXISTS idx_services_companyId ON services(companyId);
CREATE INDEX IF NOT EXISTS idx_services_companyId_active ON services(companyId, isActive);

-- Tabela przypisania usług do pracowników
CREATE TABLE IF NOT EXISTS worker_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL,
  serviceId INTEGER NOT NULL,
  canPerform INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(serviceId) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(workerId, serviceId)
);

-- Indeks dla wyszukiwania usług pracownika
CREATE INDEX IF NOT EXISTS idx_worker_services_workerId ON worker_services(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_services_serviceId ON worker_services(serviceId);
