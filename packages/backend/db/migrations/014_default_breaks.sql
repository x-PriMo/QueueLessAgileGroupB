-- Migracja 014: Domyślne przerwy dla firmy
-- Dodaje kolumnę defaultBreaks do tabeli companies

ALTER TABLE companies ADD COLUMN defaultBreaks TEXT DEFAULT '[]';

-- Format JSON przykład:
-- [{"startTime": "10:00", "endTime": "10:15"}, {"startTime": "13:00", "endTime": "14:00"}]
