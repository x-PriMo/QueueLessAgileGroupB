-- Dodanie brakujących pól do rezerwacji (jeśli nie istnieją)
-- customerName i phone są nowymi polami
ALTER TABLE reservations ADD COLUMN customerName TEXT;
ALTER TABLE reservations ADD COLUMN phone TEXT;

-- Tabela logów wysłanych emaili
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservationId INTEGER NOT NULL,
  emailType TEXT NOT NULL CHECK (emailType IN ('CONFIRMATION', 'CANCELLATION', 'REMINDER', 'DECISION')),
  recipientEmail TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'PENDING')),
  messageId TEXT,
  errorMessage TEXT,
  sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reservationId) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Indeksy dla logów
CREATE INDEX IF NOT EXISTS idx_email_logs_reservationId ON email_logs(reservationId);
CREATE INDEX IF NOT EXISTS idx_email_logs_sentAt ON email_logs(sentAt);
