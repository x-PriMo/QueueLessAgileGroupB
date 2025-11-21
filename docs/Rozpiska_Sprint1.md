# Rozpiska Sprint 1 - QueueLess
## Podział zadań i plików w zespole

### Rafał
**Zadania**: T1, T5, T16, T39, T40

**Ukończone**:
- ✅ T1: Inicjalizacja środowiska
  - `/package.json`
  - `/package-lock.json`
  - `/tsconfig.base.json`
  - `/.eslintrc.cjs`
  - `/.prettierrc`
  - `/.gitignore`
  - `/packages/backend/package.json`
  - `/packages/backend/tsconfig.json`
  - `/packages/frontend/package.json`
  - `/packages/frontend/tsconfig.json`
  - `/packages/frontend/vite.config.ts`
  - `/packages/frontend/tailwind.config.ts`
  - `/packages/frontend/postcss.config.js`

- ✅ T5: GitHub Actions (CI)
  - `/.github/workflows/ci.yml`
  - `/README.md`

- ✅ T16: E-mail potwierdzenia (ICS)
  - `/packages/backend/src/lib/mailer.ts`
  - `/packages/backend/src/lib/ics.ts`
  - `/packages/backend/src/routes/reservations.ts` (integracja ICS)

**W toku**:
- 🔄 T39: Dokumentacja (częściowo)
  - `/docs/PROJECT_GUIDE.md`
  - `/docs/AI_CONTEXT.md`

**Nierozpoczęte**: T40

**Liczba plików**: 18

---

### Przemysław
**Zadania**: T3, T13, T17, T19, T27, T28, T29, T33, T34

**Ukończone**:
- ✅ T3: Backend scaffold
  - `/packages/backend/src/index.ts`
  - `/packages/backend/src/middleware/error.ts`
  - `/packages/backend/src/routes/companies.ts`
  
- ✅ T17: Rate-limit POST /reservations
  - `/packages/backend/src/middleware/rateLimit.ts`
  - `/packages/backend/src/routes/reservations.ts`

- ✅ T19: RBAC (Owner/Worker)
  - `/packages/backend/src/routes/auth.ts`
  - `/packages/backend/src/middleware/auth.ts`
  - `/packages/backend/src/routes/worker.ts` (nowy)
  - `/packages/backend/src/routes/queue.ts` (nowy)

**W toku**:
- 🔄 T13: Algorytm wolnych slotów (częściowo w services.ts)

**Nierozpoczęte**: T27, T28, T29, T33, T34

**Liczba plików**: 10

---

### Daniel
**Zadania**: T4, T8, T10, T11, T12, T15, T22, T23, T25, T26

**Ukończone**:
- ✅ T4: Baza i migracje
  - `/packages/backend/src/lib/db.ts`
  - `/packages/backend/src/types.ts`
  - `/packages/backend/src/types/ambient.d.ts`
  - `/packages/backend/src/types/express-session.d.ts`
  - `/packages/backend/db/migrate.ts`
  - `/packages/backend/db/migrations/001_init.sql`
  - `/packages/backend/db/migrations/002_company_meta.sql`
  - `/packages/backend/db/migrations/003_working_hours.sql`
  - `/packages/backend/db/migrations/004_company_requests.sql`
  - `/packages/backend/db/migrations/005_status_tables.sql`
  - `/packages/backend/db/migrations/006_services.sql`
  - `/packages/backend/db/migrations/007_reservations_update.sql`
  - `/packages/backend/db/migrations/008_users_update.sql`
  - `/packages/backend/db/migrations/009_companies_update.sql`
  - `/packages/backend/db/migrations/010_email_system.sql`
  - `/packages/backend/db/migrations/011_company_contact_fields.sql`
  - `/packages/backend/db/seed.ts`

- ✅ T11: Godziny pracy
  - `/packages/backend/src/routes/workingHours.ts`

- ✅ T15: Auto-przydział pracownika
  - `/packages/backend/src/routes/reservations.ts` (logika auto-assignment)

**W toku**:
- 🔄 T8: Settings w DB (częściowo)
- 🔄 T10: Worker services (częściowo)

**Nierozpoczęte**: T12, T22, T23, T25, T26

**Liczba plików**: 19

---

### Kamil
**Zadania**: T2, T14, T18, T20, T21, T24, T37

**Ukończone**:
- ✅ T2: Frontend scaffold
  - `/packages/frontend/index.html`
  - `/packages/frontend/src/main.tsx`
  - `/packages/frontend/src/App.tsx`
  - `/packages/frontend/src/router.tsx`
  - `/packages/frontend/src/components/Logo.tsx`
  - `/packages/frontend/src/components/ProtectedRoute.tsx`
  - `/packages/frontend/src/pages/HomePage.tsx`
  - `/packages/frontend/src/styles/index.css`
  - `/packages/frontend/src/styles/brand.css`

- ✅ T14: Formularz rezerwacji
  - `/packages/frontend/src/pages/ReservationPage.tsx`
  - `/packages/frontend/src/components/InlineReservationPanel.tsx`
  - `/packages/frontend/src/components/ServiceSelector.tsx`

- ✅ T18: „Moje rezerwacje"
  - `/packages/frontend/src/pages/UserDashboard.tsx`

- ✅ T20: Panel ustawień firmy
  - `/packages/frontend/src/pages/CompanySettingsPage.tsx`
  - `/packages/frontend/src/pages/OwnerDashboard.tsx`
  - `/packages/frontend/src/components/OwnerScheduleManager.tsx`
  - `/packages/frontend/src/components/OwnerWorkersManager.tsx`
  - `/packages/frontend/src/components/OwnerCompanySettings.tsx`

- ✅ T21: Panel pracownika
  - `/packages/frontend/src/pages/WorkerDashboard.tsx`
  - `/packages/frontend/src/pages/QueuePage.tsx`

**Nierozpoczęte**: T24, T37

**Liczba plików**: 20

---

### Jakub
**Zadania**: T6, T7, T9, T31, T32, T35, T36

**Ukończone**:
- ✅ T6: Rejestracja i logowanie (sesje)
  - `/packages/frontend/src/pages/LoginPage.tsx`
  - `/packages/frontend/src/pages/RegisterPage.tsx`
  - `/packages/frontend/src/contexts/AuthContext.tsx`
  - `/packages/frontend/src/lib/api.ts`

- ✅ T7: Unauthorized page
  - `/packages/frontend/src/pages/UnauthorizedPage.tsx`

- ✅ T9: Wyszukiwarka firm
  - `/packages/frontend/src/pages/CompanyPreviewPage.tsx`
  - Backend: `/packages/backend/src/routes/companies.ts` (endpoint GET /companies)

- ✅ T32: Panel administratora
  - `/packages/frontend/src/pages/AdminDashboard.tsx`
  - Backend: `/packages/backend/src/routes/admin.ts`

**Nierozpoczęte**: T31, T35, T36

**Liczba plików**: 9

---

## Podsumowanie

### Liczba plików na osobę:
- **Rafał**: 18 plików
- **Przemysław**: 10 plików
- **Daniel**: 19 plików
- **Kamil**: 20 plików
- **Jakub**: 9 plików
- **Razem**: ~76 plików

### Status zadań Sprint 1:
- ✅ **Ukończone** (10): T1, T2, T3, T4, T5, T6, T7, T9, T11, T14, T15, T16, T17, T18, T19, T20, T21, T32
- 🔄 **W toku** (3): T8, T10, T13, T39
- ❌ **Nierozpoczęte** (poza Sprint 1): T12, T22-T29, T31, T33-T37, T40

### Kluczowe osiągnięcia:
1. Pełna infrastruktura projektu (T1-T5)
2. System autoryzacji i RBAC (T6, T7, T19)
3. Rezerwacje z auto-przydziałem i ICS (T14, T15, T16, T17)
4. Panele dla wszystkich ról (T18, T20, T21, T32)
5. Wyszukiwarka i podgląd firm (T9, T13)
