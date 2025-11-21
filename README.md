# QueueLess

Uproszczona platforma rezerwacyjna (styl Booksy) zgodna z wytycznymi z `project_rules.md`.

## Dokumentacja

- Kompleksowy przewodnik projektu: zobacz `docs/PROJECT_GUIDE.md`.
- Kontekst dla AI (Gemini 3): zobacz `docs/AI_CONTEXT.md`.

Stos technologiczny:
- Frontend: React + TypeScript + Vite, Tailwind, Headless UI, React Router
- Backend: Node.js + Express + TypeScript
- Baza: SQLite (better-sqlite3), migracje .sql, seed danych
- Walidacje: Zod, Daty: Luxon, E‑mail: Nodemailer (Ethereal)

Uruchamianie w dev:
- Backend: `npm run dev:backend`
- Frontend: `npm run dev:frontend`

Środowisko dev zakłada CORS z origin `http://localhost:5173` i sesje HTTP.

## Migracje i seed bazy danych

Przed pierwszym logowaniem uruchom migracje i seed w pakiecie backend:

- `npm run migrate -w packages/backend`
- `npm run seed -w packages/backend`

Po seedzie dostępne są konta demo:

- Admin platformy: `admin@queueless.local` / `admin123`
- Właściciel demo: `owner@queueless.local` / `owner123`

Logowanie admina wymaga roli `PLATFORM_ADMIN`. Po poprawnym logowaniu zostaniesz przekierowany do `Panel administratora` (`/dashboard/admin`).

Jeśli logowanie nie działa w przeglądarce:
- Upewnij się, że backend działa na `http://localhost:3001` i frontend na `http://localhost:5173`.
- Sprawdź w DevTools, czy odpowiedź `POST /auth/login` ustawia cookie `connect.sid` (nagłówek `Set-Cookie`).
- Wyczyść cookies dla `localhost:3001` i spróbuj ponownie.





