CREATE TABLE IF NOT EXISTS worker_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL,
  shiftId INTEGER NOT NULL,
  FOREIGN KEY(workerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(shiftId) REFERENCES shifts(id) ON DELETE CASCADE,
  UNIQUE(workerId, shiftId)
);

CREATE INDEX IF NOT EXISTS idx_worker_shifts_workerId ON worker_shifts(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_shiftId ON worker_shifts(shiftId);
