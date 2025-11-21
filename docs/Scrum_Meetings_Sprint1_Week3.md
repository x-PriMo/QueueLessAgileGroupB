# Raport Scrum Meetings - Sprint 1, Tydzień 3
## Grupa B - QueueLess
**Data**: 18-20 listopada 2025  
**Scrum Master**: Rafał Goła  
**Product Owner**: Kamil Nowak

---

## 📋 Daily Scrum - Poniedziałek, 18.11.2025

### Co zrobiliśmy wczoraj (weekend):
- **Analiza błędów aplikacji** - zidentyfikowano problemy z ładowaniem danych
- **Naprawiono krytyczne błędy**:
  - Dodano brakujący endpoint `/companies/categories` (404 error)
  - Naprawiono race condition w `OwnerScheduleManager` (wywoływanie API z `undefined`)
  - Dodano endpoint `PUT /companies/:companyId/workers/:workerId` dla aktualizacji statusu pracowników
- **Instalacja Node.js** - skonfigurowano środowisko deweloperskie (Node 20 LTS)
- **Uruchomienie aplikacji** - backend i frontend działają poprawnie

### Na czym pracujemy dziś:
- **Rafał**: Dokumentacja projektu (AI_CONTEXT.md, Rozpiska)
- **Przemysław**: Finalizacja RBAC dla wszystkich endpointów
- **Daniel**: Weryfikacja bazy danych i integralności danych
- **Kamil**: Testy UI/UX dla paneli Owner/Worker
- **Jakub**: Przegląd bezpieczeństwa (AuthContext, API)

### Przeszkody / Blockers:
- ✅ **ROZWIĄZANE**: Brak npm w środowisku - zainstalowano Node.js 20 przez Homebrew
- ✅ **ROZWIĄZANE**: Błędy 404 w API - dodano brakujące endpointy
- 🔴 **AKTYWNE**: Niektóre komponenty ładują dane przed inicjalizacją `companyId`

---

## 📋 Daily Scrum - Wtorek, 19.11.2025

### Co zrobiliśmy wczoraj:
- **Backend**:
  - Dodano endpoint `/companies/categories` zwracający listę CATEGORIES
  - Zaimplementowano `PUT /companies/:companyId/workers/:workerId` z autoryzacją RBAC
  - Ulepszone guardy: `authGuard`, `memberGuard`, `roleGuard`
- **Frontend**:
  - Naprawiono `OwnerScheduleManager` - dodano walidację `companyId` przed API call
  - Zaktualizowano `UserDashboard` - obsługa statusów `IN_SERVICE` i `DONE`
- **Infrastruktura**:
  - Migracja do Node 20 LTS (z powodu problemów z better-sqlite3 na Node 25)
  - Udane seedowanie bazy danych

### Na czym pracujemy dziś:
- **Rafał**: Tworzenie Rozpiski i raportu Scrum
- **Przemysław**: Implementacja `DELETE /companies/:companyId/members/:userId`
- **Daniel**: Optymalizacja zapytań SQL (indeksy, JOIN)
- **Kamil**: Testowanie flow rezerwacji end-to-end
- **Jakub**: Walidacja bezpieczeństwa sesji

### Przeszkody / Blockers:
- ⚠️ **W TRAKCIE ROZWIĄZANIA**: Race conditions przy ładowaniu danych w niektórych komponentach
- 🟢 **ANALIZOWANE**: Potencjalna potrzeba paginacji dla dużych list rezerwacji

---

## 📋 Daily Scrum - Środa, 20.11.2025

### Co zrobiliśmy wczoraj:
- **Dokumentacja**:
  - Utworzono `AI_CONTEXT.md` - kontekst projektu dla AI
  - Rozpoczęto pracę nad `Rozpiska_Sprint1.md`
- **Backend**:
  - Wszystkie endpointy dla Owner/Worker działają poprawnie
  - Rate limiting działa zgodnie z oczekiwaniami
- **Frontend**:
  - Wszystkie panele (User/Owner/Worker/Admin) renderują się poprawnie
  - Logowanie i rejestracja działają bez błędów

### Na czym pracujemy dziś:
- **Rafał**: Finalizacja dokumentacji Sprint 1 (Rozpiska, Raport Scrum)
- **Przemysław**: Code review i refactoring RBAC
- **Daniel**: Przygotowanie danych demo do prezentacji
- **Kamil**: Testy responsywności na różnych rozdzielczościach
- **Jakub**: Przygotowanie checklist do review

### Przeszkody / Blockers:
- 🟢 **BRAK** - wszystkie krytyczne problemy rozwiązane

---

## 📊 Sprint Progress (Tydzień 3)

### Velocity:
- **Story Points ukończone**: 42/50 (84%)
- **Pozostałe do końca sprintu**: 8 SP

### Burn-down:
```
Dzień 1 (PON): 50 SP pozostało
Dzień 2 (WT):  32 SP pozostało  (-18)
Dzień 3 (ŚR):  8 SP pozostało   (-24)
```

### Status zadań Sprint 1:

#### ✅ Ukończone (18 zadań):
- T1: Inicjalizacja środowiska
- T2: Frontend scaffold
- T3: Backend scaffold
- T4: Baza i migracje
- T5: GitHub Actions (CI)
- T6: Rejestracja i logowanie
- T7: Unauthorized page
- T9: Wyszukiwarka firm
- T11: Godziny pracy
- T14: Formularz rezerwacji
- T15: Auto-przydział pracownika ✨
- T16: E-mail potwierdzenia (ICS) ✨
- T17: Rate-limit POST /reservations
- T18: „Moje rezerwacje" ✨
- T19: RBAC (Owner/Worker) ✨
- T20: Panel ustawień firmy
- T21: Panel pracownika
- T32: Panel administratora

#### 🔄 W trakcie (4 zadania):
- T8: Settings w DB (75%)
- T10: Worker services (60%)
- T13: Algorytm wolnych slotów (80%)
- T39: Dokumentacja (90%)

#### ❌ Nierozpoczęte (poza Sprint 1):
- T12, T22-T31, T33-T38, T40

---

## 🎯 Sprint 1 Retrospective (wstępna)

### ✅ Co poszło dobrze:
1. **Szybka komunikacja w zespole** - błędy naprawiane w ciągu godzin
2. **Solid tech stack** - React + Express + SQLite działa stabilnie
3. **Dobre praktyki RBAC** - middleware łatwo rozszerzalny
4. **Auto-przydział pracowników** - kompleksowa logika w `reservations.ts`
5. **ICS attachments** - pełna integracja z emailami

### 🔴 Co można poprawić:
1. **Race conditions** - niektóre komponenty ładują się przed inicjalizacją danych
2. **TypeScript strict mode** - wiele miejsc wymaga lepszego typowania (szczególnie `any`)
3. **Error handling** - brak uniform error handling w frontend
4. **Testy** - coverage < 50%, potrzebne więcej unit testów

### 🔄 Action items na następny sprint:
1. **Dodać frontend error boundary** dla lepszej obsługi błędów
2. **Zaimplementować loading states** we wszystkich komponentach ładujących dane
3. **Zwiększyć coverage testów** do minimum 70%
4. **Code review** - ustalić obowiązkowe review przed merge

---

## 📈 Definition of Done - Weryfikacja

### T15: Auto-przydział pracownika ✅
- [x] Logika auto-assignment w `reservations.ts`
- [x] SELECT pracowników z najmniejszym obciążeniem
- [x] Sprawdzanie dostępności przez `worker_services`
- [x] Fallback jeśli brak dostępnych pracowników
- [x] Testy manualne (demo account)

### T16: E-mail potwierdzenia (ICS) ✅
- [x] Generator ICS (`lib/ics.ts`)
- [x] Integracja z mailerem (attachment)
- [x] Format VEVENT zgodny z RFC 5545
- [x] Wysyłka przez Nodemailer (Ethereal w dev)
- [x] Weryfikacja w email preview

### T18: „Moje rezerwacje" ✅
- [x] Backend endpoint `/reservations/my`
- [x] Filtrowanie po `req.session.userId`
- [x] Frontend `UserDashboard.tsx`
- [x] Wyświetlanie wszystkich statusów (PENDING, ACCEPTED, IN_SERVICE, DONE)
- [x] Sortowanie po dacie (DESC)

### T19: RBAC (Owner/Worker) ✅
- [x] Middleware: `authGuard`, `roleGuard`, `memberGuard`
- [x] Backend routes zabezpieczone
- [x] Frontend `ProtectedRoute`
- [x] Testy dla Owner (dashboard, workers, settings)
- [x] Testy dla Worker (queue, shifts)

---

## 👥 Team Contributions

### Rafał Goła (Scrum Master):
- Inicjalizacja środowiska (T1)
- CI/CD setup (T5)
- ICS integration (T16)
- Dokumentacja (AI_CONTEXT, Rozpiska)
- **Impact**: 🟢 **High**

### Przemysław:
- Backend RBAC (T19)
- Rate limiting (T17)
- Worker/Queue routes
- **Impact**: 🟢 **High**

### Daniel:
- Database migrations (T4)
- Auto-assignment logic (T15)
- Working hours (T11)
- **Impact**: 🟢 **High**

### Kamil:
- Frontend scaffold (T2)
- Reservation form (T14)
- Owner/Worker dashboards (T20, T21)
- **Impact**: 🟢 **High**

### Jakub:
- Auth system (T6, T7)
- API client (`api.ts`)
- Admin dashboard (T32)
- **Impact**: 🟢 **High**

---

## 📝 Notatki

### Decyzje techniczne:
1. **Node 20 LTS** zamiast Node 25 - lepsza kompatybilność z better-sqlite3
2. **Guard chain**: `authGuard -> memberGuard -> roleGuard` dla maksymalnego bezpieczeństwa
3. **Polling co 5s** zamiast WebSockets (zgodnie z requirements)

### Risks & Mitigations:
- **Risk**: Brak WebSockets może powodować opóźnienia w real-time updates
- **Mitigation**: Polling + optimistic UI updates

---

**Następne spotkanie**: Czwartek, 21.11.2025, godz. 10:00  
**Agenda**: Sprint Review + Planning Sprint 2
