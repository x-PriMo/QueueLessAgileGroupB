# project_rules.md
QueueLess — zasady projektu i wytwarzania (repo)

Zakres i cel
- Monorepo tworzące wielofirmową aplikację rezerwacji i kolejek (FE+BE).
- Wersja akademicka, z naciskiem na jakość, testy i zgodność z RBAC.

Architektura i stos
- Frontend: React + TypeScript + Vite, Tailwind, Headless UI, React Router.
- Backend: Node.js + Express + TypeScript.
- Baza: SQLite (better-sqlite3), migracje .sql, seed danych.
- Walidacje: Zod. Daty: Luxon. E‑mail: Nodemailer (Ethereal → SMTP).
- Testy: Jest, React Testing Library, supertest. CI: GitHub Actions.
- Real‑time: polling (5 s). Brak WebSocket/SSE.
- Zakazy: brak Prisma, brak Postgresa, brak shadcn/ui, brak nowych
  bibliotek bez zgody PO/Tech Lead.

Struktura repo
- root: workspaces, ESLint, Prettier (printWidth 80), ci.yml, README.
- packages/backend: src/*, db/migrations/*.sql, migrate.ts, seed.ts,
  middleware (auth, rbac, rateLimit, error), uploads, lib (db, mailer, ics).
- packages/frontend: src/pages/*, components/*, lib/api.ts, router.

RBAC — wymagania
- Role: USER, WORKER, OWNER, PLATFORM_ADMIN.
- Guardy API: authGuard, memberGuard(companyId), roleGuard(OWNER),
  workerOrOwnerGuard, ownReservationGuard.
- UI ukrywa elementy niedostępne dla bieżącej roli.

Baza danych i migracje
- better-sqlite3 w trybie WAL, busyTimeout 5000 ms.
- Migracje numerowane .sql (idempotentne). Runner migrate.ts uruchamiany
  przy starcie dev i w CI.
- Indeksy: (companyId, date, startTime) dla Reservation; (companyId, date)
  dla Shift. Klucze obce egzekwowane PRAGMA foreign_keys=ON.
- Seed: konto admina platformy, 1–2 firmy demo, pracownicy, godziny,
  przerwy, shifty na jutro.

Style i jakość
- TypeScript strict. ESLint + Prettier obowiązkowe (CI gate).
- Commity: Conventional Commits (feat:, fix:, refactor:, chore:, test:,
  docs:, ci:), polskie opisy mile widziane.
- Format i lint uruchamiane w pre‑commit (husky) oraz w CI.

Branching i PR
- main (chroniony), feature/* (zadania), fix/* (naprawy).
- Każda zmiana przez PR: opis, zakres, testy, link do issue.
- Code review: min. 1 aprobata; zielone CI wymagane do merge.

CI (GitHub Actions)
- Kroki: checkout → setup-node 20 → npm ci → lint → test (BE/FE) →
  build (BE/FE) → artefakty logów w razie błędów.
- Zero ostrzeżeń lintera. Testy muszą przechodzić.

Testy
- supertest: auth, RBAC, sloty (z godzinami/przerwami/shiftami), rezerwacje
  (autoAccept ON/OFF, reschedule, rate‑limit), kolejka (statusy, ETA),
  admin (create company, soft ban).
- RTL: logowanie/rejestracja, formularz rezerwacji, ustawienia firmy,
  kolejka (smoke).
- Minimalne pokrycie: krytyczne ścieżki funkcjonalne.

Bezpieczeństwo
- bcrypt do haseł; express‑session (sameSite=lax, secure=false w dev);
  helmet; CORS (origin http://localhost:5173, credentials true).
- Rate‑limit: /auth/login 5/min/IP; /reservations ≥ 1/30 s na IP+e‑mail.
- Upload logo: PNG/JPG, ≥256×256, ≤6 MB; waliduj MIME/rozmiar; zapisuj
  bezpieczne nazwy; serwuj z /uploads/logos.
- Dane osobowe: maskuj e‑mail klienta w panelu firmy; nie loguj PII.

Dostępność (WCAG)
- Wszystkie formularze: label‑for, aria‑invalid, focus visible; nawigacja
  klawiaturą; kontrasty zgodne z Tailwind default lub wyższe.

Czas i strefy
- Daty „YYYY‑MM‑DD”, godziny „HH:mm”, timezone per firma; używaj Luxon do
  obliczeń slotów, ETA i walidacji.

Błędy i logowanie
- Globalny error handler (JSON), kody 4xx/5xx; dedykowany 404.
- Nie loguj haseł ani tokenów; loguj identyfikatory żądań i błędów.

Wytyczne wydajności
- Zapytania przygotowane; batch odczytów kiedy możliwe; indeksy zgodnie z
  sekcją „Baza danych”.

Dokumentacja
- README: uruchomienie, migracje, seed, SMTP, role, konta demo.
- user_rules.md i project_rules.md utrzymywane wraz z kodem.
- Zmiany architektoniczne opisuj w docs/ADR‑YYYY‑MM‑DD‑*.md.

Proces Agile (zajęcia)
- Sprinty zgodne z harmonogramem prowadzącego (3 sprinty po 3 tygodnie).
- Raport tygodniowy: postępy, Kanban screenshot, PR‑y, ryzyka.
- Prezentacje: S1/S2/S3 review + retrospektywa + demo.

Definition of Ready (DoR)
- User story ma AC, makietę/widok, estymację i brakujące zależności
  zidentyfikowane.

Definition of Done (DoD)
- Kod w repo, PR z review, zielone lint/test/build, zaktualizowana
  dokumentacja, brak „coming soon”, ochrona RBAC i walidacje Zod.

Checklist przed merge do main
- Funkcja pokryta testami.
- Brak regresji w CI.
- RBAC i a11y sprawdzone.
- Dokumentacja uaktualniona.