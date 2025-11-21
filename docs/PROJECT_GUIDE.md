# QueueLess — Kompleksowy Przewodnik Projektu

Ten dokument stanowi jedną, spójną dokumentację projektu QueueLess. Zawiera
opis celu i architektury, zasady pracy i jakości, kluczową logikę biznesową,
plan zadań Sprintu 1 oraz praktyczny przewodnik dla nowych developerów.

---

## 1. Opis projektu

### Cel i główne założenia
- Wielofirmowa aplikacja rezerwacji i kolejek (styl Booksy) z naciskiem na
  jakość, testy i zgodność z RBAC.
- Obsługa ról: `USER`, `WORKER`, `OWNER`, `PLATFORM_ADMIN`.
- Real‑time przez polling (co 5 s), bez WebSocket/SSE.
- Wersja akademicka, zgodna z wymaganiami dostępności (WCAG) i bezpieczeństwa.

### Architektura systemu i główne komponenty
- Frontend: `React + TypeScript + Vite`, Tailwind, Headless UI, React Router.
  - Strony kluczowe: `HomePage`, `ReservationPage`, `CompanyPreviewPage`,
    dashboardy (`OwnerDashboard`, `UserDashboard`, `WorkerDashboard`).
  - Warstwa API: `packages/frontend/src/lib/api.ts`.
- Backend: `Node.js + Express + TypeScript`.
  - Główne routery: `auth`, `companies`, `admin`, `company-requests`,
    `reservations`, `working-hours`, `services`.
  - Middleware RBAC: `authGuard`, `memberGuard(companyId)`, `roleGuard`,
    `workerOrOwnerGuard` w `packages/backend/src/middleware/auth.ts`.
- Baza danych: `SQLite` (biblioteka `better-sqlite3`), migracje `.sql`, seed.
  - Kluczowe tabele: `users`, `companies`, `company_members`, `shifts`,
    `breaks`, `reservations`, `services`, `worker_services`, `worker_shifts`.
- E‑mail: Nodemailer (Ethereal w dev), moduł `packages/backend/src/lib/mailer.ts`.
- ICS: generator plików iCalendar w `packages/backend/src/lib/ics.ts`.
- Walidacje: `Zod`. Daty/czasy: `Luxon`.
- Testy: Jest, RTL, Supertest. CI: GitHub Actions.

### Technologie i narzędzia
- Język: TypeScript (strict), formatowanie: Prettier (`printWidth: 80`),
  lint: ESLint.
- Dev serwery: `vite` (FE), `express` (BE) ze wspieranym CORS i sesjami.
- CI: `checkout → setup-node@20 → npm ci → lint → test → build`.
- Brak: Prisma, Postgres, shadcn/ui, ani nowych bibliotek bez zgody PO/Tech Lead.

---

## 2. Zasady projektu

### Konwencje kodowania
- TypeScript w trybie strict; unikanie skomplikowanych rozwiązań.
- ESLint + Prettier obowiązkowe; zero ostrzeżeń w CI.
- Commity: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`,
  `test:`, `docs:`, `ci:`).
- Format/lint uruchamiane w `pre-commit` (husky) oraz w CI.
- Ścieżki i nazwy plików zgodne ze strukturą monorepo.

### Zasady pracy w zespole
- Branching: `main` (chroniony), `feature/*`, `fix/*`.
- Wszystko przez Pull Request: opis, zakres, testy, link do issue.
- Code review: min. 1 aprobata; zielone CI wymagane do merge.
- Dokumentacja aktualizowana na bieżąco (`README`, `docs/ADR-YYYY-MM-DD-*.md`,
  `user_rules.md`, `project_rules.md`).
- Agile: 3 sprinty po 3 tygodnie; raporty tygodniowe; prezentacje S1/S2/S3.

### Wymagania dotyczące jakości kodu
- Testy krytycznych ścieżek funkcjonalnych; minimalne pokrycie w miejscach
  newralgicznych (auth, RBAC, rezerwacje, sloty, kolejka).
- Stabilna integracja FE/BE (zgodne kontrakty API, walidacje Zod po obu stronach).
- Wydajność: zapytania przygotowane, batch odczytów gdy możliwe, indeksy
  (`(companyId, date, startTime)` dla `reservations`; `(companyId, date)` dla
  `shifts`).

### Code review i wdrażanie zmian
- Każdy PR: opis problemu/rozwiązania, testy, scenariusz ręczny, wpływ na RBAC.
- CI gates: `lint → test → build`; brak ostrzeżeń lintera, testy przechodzą.
- Po merge: dokumentacja aktualna, brak „coming soon”.

---

## 3. Logika biznesowa

### Kluczowe procesy i algorytmy
- Rejestracja/logowanie (sesje HTTP): `packages/backend/src/routes/auth.ts`.
  - Rate‑limit logowania: `loginRateLimit` w `middleware/rateLimit`.
  - Rola efektywna dla UI (OWNER/WORKER) wyliczana na podstawie członkostw.

- Wyszukiwarka firm: `GET /companies` w `routes/companies.ts`.
  - Filtry: kategoria (`/companies?category=...`), pełnotekstowy `q` po nazwie
    i opisie.

- Godziny pracy i przerwy: `routes/workingHours.ts`.
  - CRUD z walidacją i RBAC (OWNER). Indeksy zgodne z wymaganiami.

- Usługi i wykonywalność: `routes/services.ts`.
  - Zarządzanie usługami (OWNER); przypisywanie usług do pracowników
    (`worker_services`), filtrowanie slotów po pracowniku.

- Algorytm wolnych slotów: `GET /services/companies/:companyId/services/:serviceId/slots`.
  - Dane wejściowe: `companyId`, `serviceId`, `date`, opcjonalnie `workerId`.
  - Dane bazowe: godziny pracy (`shifts`), przerwy (`breaks`), rezerwacje dla
    dnia (`reservations`), możliwość pracownika (`worker_services`).
  - Wyjście: lista slotów z `startTime`, `endTime`, `availableWorkers`,
    flagą `isAvailable` oraz `serviceDuration`. Uwzględnia statusy rezerwacji
    i trainee (wydłuża czas przez `traineeExtraMinutes` w docelowej wersji).

- Tworzenie rezerwacji: `POST /reservations` w `routes/reservations.ts`.
  - Walidacja Zod: `companyId`, `email`, `date`, `startTime`, opcjonalnie
    `serviceId`, `workerId`, `customerName`, `phone`.
  - Wyliczanie `endTime` na podstawie `services.durationMinutes` i Luxon.
  - Status: `ACCEPTED` lub `PENDING` zależnie od `companies.autoAccept`.
  - Zapis do `reservations` z opcjonalnymi `serviceId`/`workerId`.
  - E‑mail potwierdzający (Nodemailer/Ethereal) z logowaniem wyniku w
    `email_logs`. ICS generowany przez `lib/ics.ts` — aktualnie nie jest
    dołączany w mailerze, integracja przewidziana.
  - Rate‑limit: `reservationRateLimit`.

- Kolejka i dashboardy (OWNER/WORKER/USER): komponenty FE oraz dedykowane
  routery (do rozbudowy), z RBAC ukrywającym niedostępne elementy UI.

### Flow danych (skrót)
- „Wybierz firmę” (FE `ReservationPage`):
  - `GET /companies/categories/list`, `GET /companies` → wybór firmy.
  - Inline panel: wybór pracownika (`any` lub konkretny), data → wolne sloty.
  - Rezerwacja: `POST /reservations` z `companyId`, `email`, `date`, `time`,
    opcjonalnie `serviceId`, `workerId`.

- „Podgląd firmy” (FE `CompanyPreviewPage`):
  - `GET /services/companies/:id/services` → wybór usługi.
  - `GET /services/.../slots?date=...&workerId=...` → wybór slotu.
  - Przekazanie do `/reserve` przez `location.state` (`companyId`, `serviceId`,
    `date`, `time`, `workerId`).

- E‑mail potwierdzenia:
  - `sendReservationConfirmationEmail` generuje HTML/TXT; ICS dostępny przez
    `generateReservationICS` (do integracji). Logi w `email_logs`.

### Interakcje między modułami
- FE komponuje UI i wywołania HTTP przez `lib/api.ts` (credentials, CORS).
- BE routery walidują (Zod), bronią (RBAC), wykonują operacje na DB (prepared
  statements), zwracają JSON (globalny error handler).
- DB spina encje: firmy, członkostwa, zmiany/przerwy, usługi, rezerwacje.

---

## 4. Zadania z Sprintu 1

Źródło listy: `project_rules.md` (Sprint 1: T1, T2, T3, T4, T5, T6, T9, T11,
T13, T14, T15, T16, T17, T19).

### Statusy (na bazie repozytorium i wdrożonych funkcji)
- T1 Inicjalizacja środowiska — zakończone (dev serwery działają).
- T2 Frontend scaffold — zakończone (strony, router, Tailwind, Vite).
- T3 Backend scaffold — zakończone (routery, middleware, CORS, sesje).
- T4 Baza i migracje — zakończone („better‑sqlite3”, migracje `.sql`),
  uwaga: bez Prisma (zgodne z zakazami).
- T5 GitHub Actions (CI) — zakończone (`.github/workflows/ci.yml`).
- T6 Rejestracja i logowanie (sesje) — zakończone (`routes/auth.ts`).
- T9 Wyszukiwarka firm — zakończone (`GET /companies` + filtry).
- T11 Godziny pracy — zakończone (`workingHours.ts`).
- T13 Algorytm wolnych slotów — zakończone (`services.ts` slots).
- T14 Formularz rezerwacji — zakończone (UI `ReservationPage`, walidacje).
- T15 Auto‑przydział pracownika — w toku (sloty wskazują dostępnych; przydział
  na etapie POST jest opcjonalny; docelowo auto‑assign gdy `workerId=any`).
- T16 E‑mail potwierdzenia (ICS) — częściowo (e‑mail wysyłany; ICS generator
  dostępny, brak załącznika w mailerze — integracja planowana).
- T17 Rate‑limit POST /reservations — zakończone.
- T19 RBAC (Owner/Worker) — częściowo (guardy obecne, wymagają dalszego
  pokrycia w wybranych routerach/panelach).

### Priorytety i terminy
- Priorytet wysoki: T13, T14, T16, T17, T19.
- Terminy wg harmonogramu prowadzącego (3‑tygodniowy Sprint 1).

### Zależności między zadaniami (przykłady)
- T13 zależy od T11/T12 (godziny/przerwy) oraz dostępności `worker_services`.
- T14 zależy od T13 (sloty), T9 (listowanie firm), T6 (sesje dla USER).
- T15 zależy od T13 (dostępni pracownicy), T14 (dane wejściowe POST).
- T16 zależy od T14 (utworzenie rezerwacji) i konfiguracji SMTP.
- T17 zależy od `POST /reservations` i identyfikacji IP+e‑mail.
- T19 zależy od T6 (sesje), `company_members`, oraz guardów w routerach.

---

## 5. Przewodnik dla nowych developerów

### Konfiguracja środowiska
- Wymagania: Node.js 20, npm.
- Instalacja: `npm ci` w katalogu głównym monorepo.
- Migracje i seed:
  - `npm run migrate -w packages/backend`
  - `npm run seed -w packages/backend`
- Uruchomienie w dev:
  - Backend: `npm run dev:backend` → `http://localhost:3001`
  - Frontend: `npm run dev:frontend` → `http://localhost:5173` (lub 5174/5175)
- Sesje/CORS: backend akceptuje origin `http://localhost:5173/5174/5175`,
  cookies `sameSite=lax` (secure=false w dev).

### Budowanie i testy
- Lint: `npm run lint` (brak ostrzeżeń wymagany).
- Testy backend: `npm run test -w packages/backend` (Supertest/Jest).
- Testy frontend: `npm run test -w packages/frontend` (RTL/Jest).
- Budowa: `npm run build -w packages/backend` oraz `npm run build -w packages/frontend`.

### Najczęstsze problemy i rozwiązania
- Logowanie nie ustawia cookie: sprawdź `Set‑Cookie` w odpowiedzi `POST /auth/login`,
  wyczyść cookies `localhost:3001`, upewnij się, że oba serwery działają.
- Brak sieci dla SMTP: `mailer.ts` używa mock transportu; e‑mail się nie wyśle,
  ale backend nie zablokuje rezerwacji (logi w konsoli).
- CORS błędy: upewnij się, że frontend działa na dozwolonym porcie (5173‑5175).
- „Brak wolnych terminów”: sprawdź `shifts`, `breaks`, `services` oraz czy `reservations`
  nie zajmują slotów; w razie potrzeby zatseeduj dane.

### Punkty kontaktowe zespołu (wg zadań)
- T1/T5/T16/T39/T40 — Rafał.
- T2/T14/T18/T20/T21/T24/T37 — Kamil.
- T3/T13/T17/T19/T27/T28/T29/T33/T34 — Przemysław.
- T4/T8/T10/T11/T12/T15/T22/T23/T25/T26 — Daniel.
- T6/T7/T9/T31/T32/T35/T36 — Jakub.

### Zalecane ścieżki rozwoju
- Domknąć auto‑przydział pracownika (T15): przy `workerId=any` wybór najlepszego
  kandydata na podstawie dostępności i obłożenia.
- Dołączyć ICS do e‑maila (T16): użyć `generateReservationICS` jako załącznik
  MIME `text/calendar` w `sendReservationConfirmationEmail`.
- Rozbudować RBAC w panelach (T19): konsekwentne ukrywanie elementów UI.
- Dodać reschedule/anulowanie z walidacją kolizji i polityką firmy.
- Wprowadzić maskowanie e‑maila klienta w panelu firmy (privacy).

---

## Odwołania do kodu
- Backend:
  - `packages/backend/src/index.ts` — konfiguracja aplikacji i routery.
  - `packages/backend/src/middleware/auth.ts` — guardy RBAC.
  - `packages/backend/src/routes/*.ts` — routery (`auth`, `companies`, `admin`,
    `company-requests`, `reservations`, `working-hours`, `services`).
  - `packages/backend/src/lib/mailer.ts` — wysyłka e‑maili.
  - `packages/backend/src/lib/ics.ts` — generowanie pliku ICS.
  - `packages/backend/db/migrations/*.sql` — migracje schematu bazy.
- Frontend:
  - `packages/frontend/src/pages/ReservationPage.tsx` — formularz i przepływ rezerwacji.
  - `packages/frontend/src/pages/CompanyPreviewPage.tsx` — wybór usługi/terminu i
    przekazanie do `/reserve`.
  - `packages/frontend/src/components/ServiceSelector.tsx` — UI wyboru slotów.
  - `packages/frontend/src/lib/api.ts` — klient HTTP.

---

## Definition of Ready / Done (skrót)
- DoR: user story ma AC, makietę/widok, estymację i zidentyfikowane braki.
- DoD: kod w repo, PR z review, zielone `lint/test/build`, zaktualizowana
  dokumentacja, ochrona RBAC, walidacje Zod, brak „coming soon”.

---

## Checklist przed merge do `main`
- Funkcja pokryta testami i brak regresji w CI.
- RBAC i a11y sprawdzone; logowanie błędów bez PII.
- Dokumentacja uaktualniona; brak nowych bibliotek bez zgody.

Poniżej masz praktyczną „paczkę kontekstu”, czyli co Gemini 3 powinno wiedzieć, żeby sprawnie przejąć i rozwijać kod w projekcie Antigravity.

Cel Projektu

- Krótki opis domeny i problemu, który rozwiązuje Antigravity.
- Główne persony użytkowników i kluczowe scenariusze (MVP → rozszerzenia).
- Kryteria sukcesu (funkcjonalne i niefunkcjonalne: wydajność, niezawodność).
- Zakres obecnego sprintu i definicja „done”.
- Ograniczenia techniczne i biznesowe (np. brak nowych bibliotek bez zgody).
Architektura

- Stos technologiczny (FE/BE, baza, komunikacja, narzędzia pomocnicze).
- Diagramy wysokopoziomowe: moduły, przepływ danych, interakcje z zewnętrznymi usługami.
- Kluczowe komponenty i ich odpowiedzialności (warstwa API, cache, kolejki).
- Miejsca krytyczne: autoryzacja, obsługa płatności, dane wrażliwe.
- Wzorce i decyzje architektoniczne (ADR-y: co, dlaczego i kiedy).
Repozytorium i Struktura

- Link do repo, główne gałęzie ( main , develop , feature/* ).
- Konwencje nazewnicze plików/katalogów i podział na pakiety/workspaces.
- Lokacje „entry points” (np. src/index.ts , src/app.tsx ) i helpery.
- Skrypty npm / make do najczęstszych zadań (dev, build, test, lint).
- Mapa testów i folderów danych ( fixtures , migrations , seeds ).
Konfiguracja Środowiska

- Wymagane wersje narzędzi (np. Node 20, npm ci ).
- Konfiguracja .env (wymagane klucze, bez wartości — osobny secret store).
- Jak uruchomić lokalnie: npm run dev:<moduł> i wykorzystywane porty.
- Migracje i seed bazy: komendy, kolejność, dane demo.
- Obsługa CORS, cookies/sesji i pochodzeń ( origin ) w dev.
Procesy i Zasady Jakości

- Konwencje kodowania (TS strict, ESLint/Prettier, styl importów).
- Conventional Commits i zasady PR (opis, testy, wpływ na RBAC/a11y).
- Code review: kryteria akceptacji i minimalna liczba aprobat.
- CI/CD: kroki ( lint → test → build ), artefakty, polityka wersjonowania.
- Zakazy i ograniczenia (np. brak dodawania bibliotek bez zgody Tech Leada).
API i Kontrakty

- Lista głównych endpointów (metoda, ścieżka, schematy request/response).
- Walidacje (np. Zod) i kody błędów wraz z konwencją komunikatów.
- RBAC/guardy: jak role wpływają na dostęp do endpointów.
- Rate-limit i retry policy (gdzie, jakie limity i backoff).
- Kompatybilność wersji API (ew. deprecations).
Model Danych

- Schemat bazy: tabele, klucze, relacje, indeksy.
- Inwarianty i integralność (foreign keys, unikalność, walidacje).
- Zasady migracji (idempotentne, kolejność, rollback).
- Dane seed: cele, zakres, loginy demo, ograniczenia użycia.
- Polityka prywatności i PII (maskowanie, retencja, brak logowania wrażliwych danych).
Testy

- Frameworki (unit/integration/e2e), uruchamiane komendy.
- Zasady pokrycia i krytyczne ścieżki (auth, RBAC, rezerwacje, sloty).
- Mocki i test doubles: czego nie testujemy integracyjnie (np. SMTP w dev).
- Jak uruchamiać testy selektywnie i diagnozować flaky.
- Raporty testowe i gdzie w CI trafią logi.
Bezpieczeństwo

- Uwierzytelnianie i sesje (cookies, sameSite , secure w dev/production).
- Autoryzacja i role, ochrona UI/endpointów (RBAC).
- Rate-limit, helmet, CORS i bezpieczne nagłówki.
- Zarządzanie sekretami (jak przekazywać Gemini zasłonięte wartości).
- Uploady: dopuszczalne typy/rozmiary, walidacje MIME, bezpieczne nazwy.
UX i A11y

- Design tokens/kolory, komponenty bazowe, biblioteki UI.
- Zasady dostępności (labels, aria-* , focus-visible, kontrasty).
- Konwencja obsługi błędów i komunikatów w UI.
- Nawigacja i routing, przepływy krytyczne (np. formularz rezerwacji).
Obserwowalność

- Logowanie: co logować, czego nie logować (PII, hasła).
- Error handling globalny (format JSON, kody 4xx/5xx).
- Debug flags, tryb deweloperski vs produkcyjny.
- Monitoring/metrics (jeśli są) i miejsce analizy.
Backlog i Stan Sprintu

- Lista zadań (status, priorytet, zależności).
- Aktualne blokery i ryzyka (techniczne i organizacyjne).
- Plany integracji (np. ICS jako attach w mailach, auto‑przydział pracownika).
- Definition of Ready/Done i checklist przed merge.
Szablony Kontekstu (do przekazania Gemini 3)

- „Context pack” jako plik do wczytania przed sesją:
  
  - project_overview : 3–5 zdań misji i domeny.
  - architecture : stos, moduły, kluczowe punkty integracji.
  - repo_map : ścieżki plików krytycznych i skrypty.
  - api_contracts : najważniejsze endpointy z polami.
  - data_model : skrót tabel + relacje.
  - quality_rules : lint, testy, CI gates, commit style.
  - rbac_policy : role i dostęp.
  - current_tasks : 3–5 priorytetów na bieżący sprint.
  - do_not_do : twarde zakazy i ograniczenia.
- Przykładowy prompt startowy dla Gemini 3:
  
  - „Masz rolę senior full‑stack w Antigravity. Przestrzegaj TS strict, ESLint/Prettier i Conventional Commits. Nie dodawaj nowych bibliotek bez zgody Tech Leada. Twoim zadaniem jest domknąć [zadanie] zgodnie z rbac_policy i api_contracts . Używaj istniejących modułów zgodnie z repo_map . Zanim zaczniesz, wypisz plan i zaimplementuj z minimalnymi, celowymi zmianami. Na końcu pokaż testy i wskaż wpływ na CI.”
Następne Kroki

- Zbierz powyższe informacje w jeden plik docs/AI_CONTEXT.md i utrzymuj go.
- Dodaj skrót do README.md , aby każdy nowy dev (i Gemini) szybko to znalazł.
- Ustal „no‑go” listę (np. nowe liby, ingerencja w schemat bez migracji/ADR).
- Zdefiniuj 3–5 najbliższych zadań z jasnymi kryteriami akceptacji.
- Przygotuj dane dostępowe (bez wartości sekretnych) i instrukcje ich pozyskania.
Jeśli chcesz, mogę od razu przygotować szablon docs/AI_CONTEXT.md dopasowany do Antigravity i wypełnić go podstawowymi sekcjami, które potem uzupełnisz szczegółami domeny i integracji.