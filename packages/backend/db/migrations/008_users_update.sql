-- Dodanie brakujących pól do tabeli users
ALTER TABLE users ADD COLUMN canServe INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN isTrainee INTEGER DEFAULT 0;
