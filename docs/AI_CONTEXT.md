# AI Context Pack for QueueLess

Ten plik zawiera skondensowaną wiedzę o projekcie QueueLess, niezbędną dla agentów AI (Gemini 3) do efektywnego przejęcia i rozwoju kodu.

## 1. Cel Projektu
**Domena**: Wielofirmowa platforma rezerwacyjna (styl Booksy) dla usługodawców i klientów.
**Misja**: Umożliwienie łatwego umawiania wizyt online z uwzględnieniem godzin pracy, przerw i dostępności pracowników.
**Persony**:
- **USER**: Klient końcowy, przegląda firmy, rezerwuje terminy, zarządza swoimi rezerwacjami.
- **OWNER**: Właściciel firmy, zarządza usługami, pracownikami, godzinami pracy.
- **WORKER**: Pracownik, obsługuje wizyty, zarządza swoją kolejką.
- **PLATFORM_ADMIN**: Administrator techniczny systemu.
**Kryteria sukcesu**:
- Poprawne działanie kluczowych ścieżek (rezerwacja, logowanie, kolejka).
- Zgodność z wymaganiami akademickimi (brak WebSocket, polling co 5s).
- Wysoka jakość kodu (TS strict, testy).

## 2. Architektura
**Stos technologiczny**:
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Headless UI, React Router.
- **Backend**: Node.js, Express, TypeScript, Better-SQLite3.
- **Komunikacja**: REST API, JSON, Polling (brak WS).
- **Narzędzia**: Nodemailer (Ethereal), Luxon (daty), Zod (walidacja).

**Kluczowe komponenty**:
- **API Layer**: `packages/backend/src/routes/*.ts` - punkty wejścia REST.
- **Middleware**: `authGuard`, `roleGuard`, `memberGuard` - bezpieczeństwo.
- **Database**: SQLite (`queueless.db`) z migracjami SQL.
- **Mailer**: `lib/mailer.ts` - powiadomienia e-mail.

## 3. Repozytorium i Struktura
**Monorepo**:
- `packages/backend`: Serwer API, baza danych.
- `packages/frontend`: Aplikacja kliencka.
- `docs`: Dokumentacja projektu.

**Entry Points**:
- Backend: `packages/backend/src/index.ts`
- Frontend: `packages/frontend/src/main.tsx`

**Skrypty**:
- `npm run dev:backend` / `dev:frontend`: Uruchamianie serwerów deweloperskich.
- `npm run migrate -w packages/backend`: Migracje bazy.
- `npm run seed -w packages/backend`: Seedowanie danych.
- `npm run test:backend` / `test:frontend`: Testy.

## 4. Konfiguracja Środowiska
**Wymagania**: Node.js 20+, npm.
**Zmienne środowiskowe**:
- `PORT`: Port backendu (domyślnie 3001).
- `SESSION_SECRET`: Sekret sesji.
- `FRONTEND_URL`: URL frontendu (dla CORS i linków w mailach).
**Uruchamianie**:
1. `npm ci`
2. `npm run migrate -w packages/backend`
3. `npm run seed -w packages/backend`
4. `npm run dev:backend` & `npm run dev:frontend`

## 5. Procesy i Zasady Jakości
**Konwencje**:
- TypeScript Strict Mode.
- ESLint + Prettier (brak warningów).
- Conventional Commits.
**Code Review**:
- Wymagana 1 aprobata.
- CI musi przechodzić (lint, test, build).
**Zakazy**:
- Brak nowych bibliotek bez zgody Tech Leada.
- Brak ORM typu Prisma (tylko SQL + better-sqlite3).

## 6. API i Kontrakty
**Główne Endpointy**:
- `POST /auth/login`: Logowanie (sesja HTTP).
- `GET /companies`: Lista firm (filtry).
- `POST /reservations`: Tworzenie rezerwacji.
- `GET /reservations/my`: Rezerwacje zalogowanego użytkownika.
- `GET /worker/queue`: Kolejka pracownika.
- `GET /queue/:companyId`: Statystyki kolejki (Owner).

**Bezpieczeństwo**:
- RBAC: `authGuard` (zalogowany), `roleGuard` (rola globalna), `memberGuard` (członkostwo w firmie).
- Walidacja: Zod dla wszystkich wejść.

## 7. Model Danych
**Baza**: SQLite.
**Tabele**:
- `users`: Użytkownicy i ich role.
- `companies`: Firmy, ustawienia.
- `reservations`: Rezerwacje (statusy: PENDING, ACCEPTED, IN_SERVICE, DONE, CANCELLED, DECLINED).
- `services`: Usługi oferowane przez firmy.
- `shifts`, `breaks`: Godziny pracy.

**Migracje**: Pliki `.sql` w `packages/backend/db/migrations`.

## 8. Testy
**Frameworki**: Jest, Supertest (Backend), React Testing Library (Frontend).
**Zakres**:
- Unit testy logiki biznesowej.
- Integracyjne testy API.
- Testy komponentów React.

## 9. Bezpieczeństwo
- Sesje HTTP (`connect.sid`), `httpOnly`, `sameSite: lax`.
- Brak przesyłania haseł w plain text (hashowanie).
- Ochrona przed CSRF (przez sameSite cookie).

## 10. UX i A11y
- **Design**: Tailwind CSS, nowoczesny, "premium" look.
- **Dostępność**: Semantyczny HTML, etykiety formularzy, obsługa klawiaturą.
- **Błędy**: Czytelne komunikaty dla użytkownika (Toast/Alert).

## 11. Backlog i Stan Sprintu (Sprint 1 - Zakończony)
**Zrealizowane**:
- [x] T15: Auto-przydział pracownika.
- [x] T16: Załączniki ICS w mailach.
- [x] T18: Dashboard "Moje rezerwacje".
- [x] T19: RBAC w panelach (Owner/Worker).
- [x] Migracja bazy danych (nowe kolumny, statusy).

**Następne kroki (Sprint 2)**:
- Wdrożenie na staging.
- Testy E2E.
- Rozbudowa modułu raportów.

## 12. Prompt Startowy dla Gemini 3
```text
Masz rolę senior full-stack w Antigravity (projekt QueueLess).
Przestrzegaj TS strict, ESLint/Prettier i Conventional Commits.
Nie dodawaj nowych bibliotek bez zgody Tech Leada.
Twoim zadaniem jest rozwijać projekt zgodnie z docs/AI_CONTEXT.md.
Używaj istniejących modułów (api.ts, mailer.ts, db.ts).
Zanim zaczniesz pracę, przeanalizuj zadanie, wypisz plan i zaimplementuj z minimalnymi zmianami.
Na końcu zweryfikuj zmiany testami.
```

Poniżej masz szybki „quick start”, czyli jak Antigravity może uruchomić aplikację u siebie lokalnie.

Wymagania

- Node.js 20 i npm.
- Dostęp do portów: backend 3001 , frontend 5173 (lub 5174/5175 gdy 5173 zajęty).
- Uprawnienia do zapisu pliku bazy queueless.db w katalogu repo.
Instalacja

- W katalogu głównym repo uruchom: npm ci .
Migracje i seed bazy

- Wykonaj migracje: npm run migrate -w packages/backend .
- Zatseeduj dane demo: npm run seed -w packages/backend .
Uruchomienie w trybie deweloperskim

- Backend: npm run dev:backend → http://localhost:3001 .
- Frontend: npm run dev:frontend → http://localhost:5173 (Vite przełączy się na 5174/5175 , jeśli 5173 jest zajęty).
- Otwórz przeglądarkę: http://localhost:5173/ (lub aktualny port, sprawdź log Vite).
Logowanie demo

- Admin: admin@queueless.local / admin123 .
- Owner: owner@queueless.local / owner123 .
- Po logowaniu admin zobaczy Dashboard Admina ( /dashboard/admin ).
Konfiguracja sieci, sesji i CORS

- Backend ma CORS dla http://localhost:5173 oraz portów fallback ( 5174/5175 ).
- Sesje w cookie: sameSite=lax , secure=false w dev.
- Jeśli frontend działa na innym porcie, sprawdź, czy backend dopuszcza ten origin.
E‑mail / SMTP

- W dev używany jest transporter Ethereal (mock) — nic nie trzeba konfigurować, podgląd e‑maila pojawi się w logach backendu.
- Do produkcji skonfiguruj SMTP (host/port/user/pass) zgodnie z modułem packages/backend/src/lib/mailer.ts .
Budowanie i testy

- Lint: npm run lint .
- Testy backend: npm run test -w packages/backend .
- Testy frontend: npm run test -w packages/frontend .
- Build: npm run build -w packages/backend i npm run build -w packages/frontend .
Rozwiązywanie problemów

- Brak cookie po logowaniu:
  - Upewnij się, że backend ( 3001 ) i frontend ( 5173/5174 ) działają.
  - Sprawdź nagłówki Set-Cookie w odpowiedzi POST /auth/login .
  - Wyczyść cookies dla localhost:3001 .
- CORS błędy:
  - Zweryfikuj, że front działa na dozwolonym porcie; przejrzyj logi backendu.
- „Brak wolnych terminów”:
  - Upewnij się, że są shifts , breaks , services i że reservations nie zajmują slotów; w razie potrzeby ponownie uruchom seed.
Dodatkowe materiały

- Kompleksowa dokumentacja projektu: docs/PROJECT_GUIDE.md (cel, architektura, kontrakty API, model danych, RBAC, testy, CI, troubleshooting).
