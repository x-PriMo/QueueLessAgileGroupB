-- Tabela godzin pracy firm (szablon na każdy dzień tygodnia)
CREATE TABLE IF NOT EXISTS working_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  dayOfWeek INTEGER NOT NULL CHECK (dayOfWeek >= 0 AND dayOfWeek <= 6), -- 0=niedziela, 1=poniedziałek, ..., 6=sobota
  startTime TEXT NOT NULL, -- HH:mm
  endTime TEXT NOT NULL, -- HH:mm
  isActive BOOLEAN NOT NULL DEFAULT 1, -- czy firma pracuje w ten dzień
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(companyId, dayOfWeek),
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indeks dla szybkiego wyszukiwania godzin pracy firmy
CREATE INDEX IF NOT EXISTS idx_working_hours_company ON working_hours(companyId);