-- Rozszerzenie tabeli rezerwacji o serviceId i workerId
ALTER TABLE reservations ADD COLUMN serviceId INTEGER;
ALTER TABLE reservations ADD COLUMN workerId INTEGER;

-- Tabela przypisania pracowników do zmian
CREATE TABLE IF NOT EXISTS worker_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL,
  shiftId INTEGER NOT NULL,
  FOREIGN KEY(workerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(shiftId) REFERENCES shifts(id) ON DELETE CASCADE,
  UNIQUE(workerId, shiftId)
);

-- Dodaj klucze obce
UPDATE reservations SET serviceId = 1 WHERE serviceId IS NULL; -- Tymczasowe
UPDATE reservations SET workerId = 1 WHERE workerId IS NULL; -- Tymczasowe

-- Dodaj klucze obce z constraintami
-- Najpierw musimy usunąć tymczasowe wartości i dodać constraint
-- To zostanie zrobione w kolejnej migracji po wprowadzeniu danych

-- Dodaj dodatkowe indeksy
CREATE INDEX IF NOT EXISTS idx_reservations_serviceId ON reservations(serviceId);
CREATE INDEX IF NOT EXISTS idx_reservations_workerId ON reservations(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_workerId ON worker_shifts(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_shiftId ON worker_shifts(shiftId);