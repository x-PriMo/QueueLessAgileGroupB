-- Dodanie brakujących pól do tabeli companies
ALTER TABLE companies ADD COLUMN slotMinutes INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN traineeExtraMinutes INTEGER DEFAULT 15;
ALTER TABLE companies ADD COLUMN autoAccept INTEGER DEFAULT 1;