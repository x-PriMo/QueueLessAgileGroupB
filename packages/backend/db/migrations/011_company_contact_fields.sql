-- Dodanie brakujących pól kontaktowych do firm
ALTER TABLE companies ADD COLUMN address TEXT;
ALTER TABLE companies ADD COLUMN phone TEXT;
ALTER TABLE companies ADD COLUMN contactEmail TEXT;
ALTER TABLE companies ADD COLUMN website TEXT;