# Raport z trzeciego tygodnia realizacji Sprintu 1
**Data**: 18-21.11.2025  
**Grupa B - QueueLess**

---

## Scrum Meeting 5 (18.11.2025)

Na meetingu 5 dopinaliśmy funkcjonalności rezerwacji i testowaliśmy cały flow od początku do końca. Zaczęliśmy od sprawdzenia auto-przydziału pracowników – chcieliśmy się upewnić, że system wybiera najmniej obciążonego pracownika, a nie losowego. Przejrzeliśmy logikę w endpoincie, dodaliśmy sortowanie po liczbie rezerwacji i sprawdziliśmy czy uwzględnia to tylko pracowników uprawnionych do danej usługi. Następnie przetestowaliśmy wysyłkę emaili z załącznikiem ICS – sprawdziliśmy czy plik generuje się poprawnie (zgodnie z RFC 5545), czy zawiera prawidłowe daty i czy można go zaimportować do Google Calendar i Outlooka. Przy okazji zauważyliśmy, że panel właściciela wyświetlał błędy przy próbie załadowania listy pracowników – komponent próbował wywołać API przed otrzymaniem `companyId` z rodzica, więc dodaliśmy prostą walidację w `useEffect`. Ustaliliśmy też, że w panelu pracownika musi być widoczna informacja o dzisiejszej zmianie (godziny pracy, przerwy), żeby pracownik wiedział kiedy może przyjmować klientów.

---

## Scrum Meeting 6 (21.11.2025)

Na meetingu 6 przeszliśmy przez wszystkie panele i przetestowaliśmy uprawnienia dla każdej roli. Zaczęliśmy od panelu właściciela – sprawdziliśmy czy może dodawać/usuwać pracowników, zmieniać ich statusy (canServe, isTrainee), edytować ustawienia firmy (slotMinutes, autoAccept) i przeglądać statystyki kolejki. Upewniliśmy się, że guardy RBAC działają poprawnie: `authGuard` sprawdza czy użytkownik jest zalogowany, `memberGuard` weryfikuje czy jest członkiem danej firmy, a `roleGuard` blokuje dostęp dla niewłaściwych ról. Potem przetestowaliśmy panel pracownika – kolejka dnia wyświetla się poprawnie, można zmieniać statusy rezerwacji (ACCEPTED → IN_SERVICE → DONE), a polling co 5 sekund odświeża dane bez przeładowania strony. Sprawdziliśmy też panel użytkownika „Moje rezerwacje" – wszystkie statusy wyświetlają się z odpowiednimi kolorami (PENDING żółty, ACCEPTED zielony, IN_SERVICE niebieski, DONE szary). Na koniec zrobiliśmy quick demo całego flow: rejestracja → wyszukanie firmy → wybór usługi i terminu → potwierdzenie emailem z ICS → obsługa przez pracownika → zmiana statusu na DONE. Wszystko działa, aplikacja gotowa do prezentacji.

---

## Zadania realizowane przez poszczególnych deweloperów

### Rafał Gola:
| Realizowane zadanie | Tygodniowy czas pracy [h] | Status |
|---------------------|---------------------------|--------|
| Konfiguracja systemu do wysyłki e-mail – potwierdzenia rezerwacji i ICS (T16) | 5 | ✅ Ukończone |
| Dokumentacja projektu (AI_CONTEXT.md, Rozpiska, Raport Scrum) (T39) | 8 | 🔄 W realizacji (90%) |
| Naprawienie błędów aplikacji (dodanie endpointu /categories) | 3 | ✅ Ukończone |

### Przemysław Habdas:
| Realizowane zadanie | Tygodniowy czas pracy [h] | Status |
|---------------------|---------------------------|--------|
| Implementacja middleware autoryzacji RBAC (T19) | 6 | ✅ Ukończone |
| Dodanie endpointu PUT /companies/:companyId/workers/:workerId | 4 | ✅ Ukończone |
| Middleware Express Rate Limit (T17) | 2 | ✅ Ukończone |

### Kamil:
| Realizowane zadanie | Tygodniowy czas pracy [h] | Status |
|---------------------|---------------------------|--------|
| Panel ustawień firmy – interfejs właściciela (T20) | 6 | ✅ Ukończone |
| Panel kolejki pracownika (T21) | 8 | ✅ Ukończone |
| Naprawienie race condition w OwnerScheduleManager | 2 | ✅ Ukończone |

### Jakub:
| Realizowane zadanie | Tygodniowy czas pracy [h] | Status |
|---------------------|---------------------------|--------|
| Widok profilu użytkownika – dane + wylogowanie (T7) | 3 | ✅ Ukończone |
| Przygotowanie panelu administratora (T32) | 6 | ✅ Ukończone |
| Wyszukiwarka firm (T9) | 4 | ✅ Ukończone |

### Daniel:
| Realizowane zadanie | Tygodniowy czas pracy [h] | Status |
|---------------------|---------------------------|--------|
| Auto-przydział pracownika (T15) | 6 | ✅ Ukończone |
| Migracje bazy danych (T4) | 4 | ✅ Ukończone |
| Ustawienia firmy w DB (T8) | 5 | 🔄 W realizacji (75%) |

---

## Cele osiągnięte w bieżącym tygodniu

- ✅ Naprawiono wszystkie krytyczne błędy aplikacji (404 errors, race conditions)
- ✅ Dodano brakujące endpointy backend (`/companies/categories`, `PUT /workers/:workerId`)
- ✅ Ukończono T15 (Auto-przydział pracownika) z pełną logiką wyboru najmniej obciążonego pracownika
- ✅ Ukończono T16 (E-mail potwierdzenia z ICS) - pełna integracja z Nodemailer i załącznikami
- ✅ Ukończono T18 („Moje rezerwacje") - endpoint backend + frontend dashboard
- ✅ Ukończono T19 (RBAC) - pełna implementacja authGuard, roleGuard, memberGuard
- ✅ Ukończono T20 (Panel ustawień firmy) - UI dla Owner z zarządzaniem pracownikami i grafikiem
- ✅ Ukończono T21 (Panel pracownika) - kolejka dnia z polling co 5s
- ✅ Ukończono T32 (Panel administratora) - podstawowy dashboard dla PLATFORM_ADMIN
- ✅ Zainstalowano i skonfigurowano środowisko Node.js 20 LTS
- ✅ Uruchomiono aplikację na localhost (frontend: 5175, backend: 3001)
- ✅ Utworzono kompleksową dokumentację projektu (AI_CONTEXT, Rozpiska, Raport Scrum)

---

## Stan tablicy Kanban na dzień 20.11.2025

### ✅ Done (18 zadań):
T1, T2, T3, T4, T5, T6, T7, T9, T11, T14, T15, T16, T17, T18, T19, T20, T21, T32

### 🔄 In Progress (4 zadania):
- T8: Ustawienia firmy w DB (75%)
- T10: Worker services (60%)
- T13: Algorytm wolnych slotów (80%)
- T39: Dokumentacja (90%)

### 📋 To Do (18 zadań):
T12, T22-T31, T33-T38, T40

---

## Commity z GitHub – stan na dzień 20.11.2025

**Kluczowe commity z tego tygodnia**:

1. `feat(backend): add categories endpoint` - dodanie GET /companies/categories
2. `feat(backend): add PUT workers endpoint with RBAC` - aktualizacja statusu pracowników
3. `fix(frontend): prevent race condition in OwnerScheduleManager` - walidacja companyId
4. `feat(backend): implement auto-assignment logic` - T15 auto-przydział pracownika
5. `feat(backend): add ICS attachment to emails` - T16 integracja ICS
6. `feat(frontend): add UserDashboard with reservations` - T18 moje rezerwacje
7. `feat(backend): implement RBAC middleware` - T19 authGuard, roleGuard, memberGuard
8. `feat(frontend): add OwnerDashboard with settings` - T20 panel właściciela
9. `feat(frontend): add WorkerDashboard with queue` - T21 panel pracownika
10. `docs: create AI_CONTEXT and Rozpiska` - dokumentacja projektu

**Statystyki**:
- Commits w tym tygodniu: ~25
- Pliki zmienione: ~40
- Linie dodane: ~3500
- Linie usunięte: ~800

---

## Implementowane widoki aplikacji

### Panel Owner (Dashboard właściciela):
- Lista firm właściciela
- Statystyki kolejki (PENDING, ACCEPTED, IN_SERVICE, DONE)
- Zarządzanie pracownikami (dodawanie, usuwanie, zmiana statusu)
- Grafik zmian pracowników
- Ustawienia firmy (slotMinutes, autoAccept, traineeExtraMinutes)

### Panel Worker (Dashboard pracownika):
- Kolejka dnia (rezerwacje ACCEPTED, IN_SERVICE)
- Zmiana statusu rezerwacji (WAITING → IN_SERVICE → DONE)
- Informacje o dzisiejszej zmianie (godziny pracy, przerwy)
- Statystyki (liczba obsłużonych klientów)

### Panel User (Dashboard użytkownika):
- Lista wszystkich rezerwacji użytkownika
- Wyświetlanie statusów (PENDING, ACCEPTED, IN_SERVICE, DONE, CANCELLED)
- Informacje o firmie i usłudze
- Data i godzina rezerwacji

### Panel Admin (Dashboard administratora):
- Lista wszystkich firm w systemie
- Statystyki użytkowników
- Zarządzanie uprawnieniami (podstawowe)

---

## Kod źródłowy – istotne fragmenty opracowane w bieżącym tygodniu

### 1. Auto-przydział pracownika (T15)
```typescript
// packages/backend/src/routes/reservations.ts
let finalWorkerId = requestedWorkerId;
if (!finalWorkerId && serviceId) {
  // Znajdź pracowników wykonujących tę usługę
  const availableWorkers = db.prepare(`
    SELECT cm.userId, 
      (SELECT COUNT(*) FROM reservations r 
       WHERE r.workerId = cm.userId 
       AND r.date = ? 
       AND r.status != 'CANCELLED') as load
    FROM company_members cm
    JOIN worker_services ws ON ws.workerId = cm.userId 
      AND ws.serviceId = ?
    WHERE cm.companyId = ? AND cm.canServe = 1
    ORDER BY load ASC
    LIMIT 1
  `).get(date, serviceId, companyId);

  if (availableWorkers) {
    finalWorkerId = availableWorkers.userId;
  }
}
```

Ten fragment implementuje logikę auto-przydziału pracownika. Jeśli klient nie wybrał konkretnego pracownika, system automatycznie przypisuje tego, który ma najmniejsze obciążenie (najmniej rezerwacji w danym dniu). Zapytanie SQL łączy tabele `company_members` i `worker_services`, aby znaleźć pracowników uprawnionych do wykonania danej usługi, a następnie sortuje ich według liczby rezerwacji.

### 2. Generowanie ICS i wysyłka e-mail (T16)
```typescript
// packages/backend/src/lib/mailer.ts
export async function sendReservationConfirmationEmail(data: ReservationEmailData) {
  const transporter = await getTransport();
  
  const result = await transporter.sendMail({
    from: 'noreply@queueless.local',
    to: data.customerEmail,
    subject: `Potwierdzenie rezerwacji - ${data.serviceName}`,
    text: textContent,
    html: htmlContent,
    attachments: data.icsContent ? [
      {
        filename: 'rezerwacja.ics',
        content: data.icsContent,
        contentType: 'text/calendar'
      }
    ] : undefined
  });
}
```

Kod obsługuje wysyłkę e-maili potwierdzających rezerwację. Wykorzystuje Nodemailer z transportem Ethereal (w trybie dev). Kluczową funkcjonalnością jest załącznik ICS - plik kalendarza zgodny z RFC 5545, który użytkownik może dodać do swojego kalendarza (Google Calendar, Outlook, iCal). E-mail zawiera zarówno wersję HTML (z gradientami i stylizacją), jak i plain text.

### 3. RBAC Middleware (T19)
```typescript
// packages/backend/src/middleware/auth.ts
export const roleGuard = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session?.user;
    if (!user || user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

export const memberGuard = (companyIdParam: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const companyId = Number(req.params[companyIdParam]);
    const userId = req.session?.user?.id;
    
    const member = db.prepare(
      'SELECT role FROM company_members WHERE companyId = ? AND userId = ?'
    ).get(companyId, userId);
    
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this company' });
    }
    next();
  };
};
```

Middleware RBAC zapewnia bezpieczeństwo na poziomie endpointów. `roleGuard` sprawdza globalną rolę użytkownika (USER/WORKER/OWNER/PLATFORM_ADMIN), a `memberGuard` weryfikuje, czy użytkownik jest członkiem danej firmy. Guardy są łączone w łańcuch: `authGuard → memberGuard → roleGuard`, co daje wielopoziomową ochronę.

### 4. Race condition fix (Frontend)
```typescript
// packages/frontend/src/components/OwnerScheduleManager.tsx
useEffect(() => {
  // Only load data when companyId is valid (not undefined or 0)
  if (companyId && companyId > 0) {
    loadData();
  }
}, [companyId]);

const loadData = async () => {
  if (!companyId || companyId === undefined) {
    console.warn('OwnerScheduleManager: companyId is undefined, skipping data load');
    return;
  }
  
  try {
    setLoading(true);
    const [workersRes, shiftsRes] = await Promise.all([
      api<{ workers: Worker[] }>(`/companies/${companyId}/workers`),
      api<{ shifts: Shift[] }>(`/shifts/company/${companyId}`)
    ]);
    setWorkers(workersRes.workers);
    setShifts(shiftsRes.shifts);
  } catch (error) {
    console.error('Błąd podczas ładowania danych:', error);
  } finally {
    setLoading(false);
  }
};
```

Naprawienie race condition polegało na dodaniu walidacji `companyId` w dwóch miejscach: w `useEffect` (przed wywołaniem `loadData`) oraz wewnątrz `loadData` (jako dodatkowy safeguard). Dzięki temu komponent nie próbuje ładować danych, dopóki `companyId` nie zostanie prawidłowo zainicjalizowane przez komponent nadrzędny.

---

## Metryki Sprint 1 (Tydzień 3)

### Velocity:
- **Story Points ukończone**: 42/50 (84%)
- **Zadania ukończone**: 18/21 zadań Sprint 1 (86%)
- **Łączny czas pracy zespołu**: ~180h

### Burn-down chart:
```
Tydzień 1: 50 SP pozostało
Tydzień 2: 32 SP pozostało (-18 SP)
Tydzień 3: 8 SP pozostało  (-24 SP)
```

### Code metrics:
- **Pliki źródłowe**: 88 plików
- **Linie kodu**: ~12,000 LOC
- **Test coverage**: ~45% (wymaga poprawy)
- **TypeScript strict mode**: Włączony
- **ESLint errors**: 0 (wszystkie naprawione)

---

## Sprint 1 Retrospective

### ✅ Co poszło dobrze:
1. **Szybka komunikacja** - błędy naprawiane w ciągu godzin, nie dni
2. **Solid tech stack** - React + Express + SQLite + TypeScript działa stabilnie
3. **RBAC implementation** - middleware łatwo rozszerzalny, dobrze zaprojektowany
4. **Auto-assignment logic** - kompleksowe rozwiązanie z optymalizacją obciążenia
5. **ICS integration** - pełna integracja z emailami, zgodność z RFC 5545
6. **Monorepo structure** - łatwe zarządzanie zależnościami, wspólne typy

### 🔴 Co można poprawić:
1. **Race conditions** - niektóre komponenty ładują się przed inicjalizacją danych
2. **TypeScript strict mode** - wiele miejsc wymaga lepszego typowania (szczególnie `any`)
3. **Error handling** - brak uniform error handling w frontend (potrzebny ErrorBoundary)
4. **Test coverage** - coverage < 50%, potrzebne więcej unit testów
5. **Loading states** - nie wszystkie komponenty mają loading indicators
6. **Documentation** - brak JSDoc dla większości funkcji

### 🔄 Action items na Sprint 2:
1. **Dodać frontend ErrorBoundary** dla lepszej obsługi błędów
2. **Zaimplementować loading states** we wszystkich komponentach ładujących dane
3. **Zwiększyć test coverage** do minimum 70%
4. **Code review** - ustalić obowiązkowe review przed merge
5. **Refactoring** - usunąć `any` types, dodać proper typing
6. **Performance optimization** - lazy loading, memoization, virtual scrolling

---

## Podsumowanie Sprint 1

Sprint 1 zakończył się sukcesem - ukończono **18 z 21 zadań** (86%), co daje **84% velocity**. Aplikacja działa stabilnie, wszystkie kluczowe funkcjonalności są zaimplementowane:

✅ **Infrastruktura**: Monorepo, CI/CD, ESLint, Prettier  
✅ **Autoryzacja**: Rejestracja, logowanie, sesje, RBAC  
✅ **Rezerwacje**: Formularz, auto-przydział, e-mail z ICS  
✅ **Panele**: User, Owner, Worker, Admin  
✅ **Baza danych**: SQLite, migracje, seed data  

Zespół pracował efektywnie, komunikacja była płynna, a problemy rozwiązywane na bieżąco. Dokumentacja projektu jest kompletna i gotowa do przekazania kolejnym deweloperom lub AI.

**Następny krok**: Sprint 2 - rozbudowa funkcjonalności (T22-T40), optymalizacja performance, zwiększenie test coverage.
