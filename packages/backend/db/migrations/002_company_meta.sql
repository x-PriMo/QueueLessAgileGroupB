-- Tabela meta dla firm: kategoria i opis (idempotentna)
CREATE TABLE IF NOT EXISTS company_meta (
  companyId INTEGER PRIMARY KEY,
  category TEXT,
  description TEXT,
  FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
);

