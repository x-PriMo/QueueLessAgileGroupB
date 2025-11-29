import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../lib/db';
import { authGuard } from '../middleware/auth';
import { DateTime } from 'luxon';

const router = Router();

// Middleware sprawdzający czy użytkownik jest pracownikiem
router.use(authGuard);

// Pobierz kolejkę dla pracownika
router.get('/queue', authGuard, (req: Request, res: Response) => {
    const userId = req.session.userId;
    const today = DateTime.now().toFormat('yyyy-MM-dd');

    // Pobierz firmę pracownika
    const member = db.prepare('SELECT companyId FROM company_members WHERE userId = ? AND (role = "WORKER" OR role = "OWNER")').get(userId) as { companyId: number } | undefined;

    if (!member) {
        return res.status(404).json({ error: 'Worker not assigned to any company' });
    }

    // Pobierz rezerwacje:
    // 1. Przypisane do tego pracownika na dziś
    // 2. LUB nieprzypisane (workerId IS NULL) w tej firmie na dziś (jeśli pracownik może je obsłużyć - uproszczenie: wszystkie nieprzypisane)
    // Status: ACCEPTED (oczekujące na realizację), IN_SERVICE (w trakcie)
    // Sortowanie: IN_SERVICE pierwsze, potem po czasie

    const queue = db.prepare(`
    SELECT 
      r.id, 
      r.email as customerEmail, 
      r.startTime, 
      r.status,
      s.durationMinutes
    FROM reservations r
    LEFT JOIN services s ON s.id = r.serviceId
    WHERE r.companyId = ? 
      AND r.date = ? 
      AND r.status IN ('ACCEPTED', 'IN_SERVICE')
      AND (r.workerId = ? OR r.workerId IS NULL)
    ORDER BY 
      CASE WHEN r.status = 'IN_SERVICE' THEN 0 ELSE 1 END,
      r.startTime ASC
  `).all(member.companyId, today, userId) as Array<{
        id: number;
        customerEmail: string;
        startTime: string;
        status: string;
        durationMinutes: number;
    }>;

    // Oblicz estimatedEndTime
    const queueWithEstimates = queue.map(item => {
        const startDt = DateTime.fromFormat(item.startTime, 'HH:mm');
        const endDt = startDt.plus({ minutes: item.durationMinutes || 30 });

        let status: 'WAITING' | 'IN_SERVICE' | 'DONE' = 'WAITING';
        if (item.status === 'IN_SERVICE') status = 'IN_SERVICE';
        // DONE są filtrowane w zapytaniu, ale dashboard może ich potrzebować?
        // Dashboard ma oddzielną sekcję "Zakończone" w statystykach, ale w głównej liście pokazuje kolejkę.
        // WorkerDashboard.tsx: queue.filter(item => item.status === 'WAITING') itp.
        // Więc musimy zwrócić też DONE jeśli chcemy je widzieć w statystykach "Zakończone" w dashboardzie.
        // Ale zapytanie wyżej filtruje DONE. Zmieńmy to.

        return {
            id: item.id,
            customerEmail: item.customerEmail,
            startTime: item.startTime,
            estimatedEndTime: endDt.toFormat('HH:mm'),
            status: status,
            isTrainee: false // TODO: Dodać logikę stażysty jeśli potrzebna
        };
    });

    // Pobierz też zakończone dzisiaj, żeby statystyki działały
    const done = db.prepare(`
    SELECT 
      r.id, 
      r.email as customerEmail, 
      r.startTime, 
      r.status,
      s.durationMinutes
    FROM reservations r
    LEFT JOIN services s ON s.id = r.serviceId
    WHERE r.companyId = ? 
      AND r.date = ? 
      AND r.status = 'DONE'
      AND r.workerId = ?
  `).all(member.companyId, today, userId) as Array<{
        id: number;
        customerEmail: string;
        startTime: string;
        status: string;
        durationMinutes: number;
    }>;

    const doneWithEstimates = done.map(item => {
        const startDt = DateTime.fromFormat(item.startTime, 'HH:mm');
        const endDt = startDt.plus({ minutes: item.durationMinutes || 30 });
        return {
            id: item.id,
            customerEmail: item.customerEmail,
            startTime: item.startTime,
            estimatedEndTime: endDt.toFormat('HH:mm'),
            status: 'DONE',
            isTrainee: false
        };
    });

    res.json({ queue: [...queueWithEstimates, ...doneWithEstimates] });
});

// Zmień status rezerwacji
router.post('/reservations/:id/status', authGuard, (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body; // Expected status: 'IN_SERVICE', 'DONE', 'CANCELLED'
    const userId = req.session.userId;

    // Sprawdź, czy rezerwacja należy do firmy pracownika
    const reservation = db.prepare(`
        SELECT r.id, r.companyId, r.workerId
        FROM reservations r
        JOIN company_members cm ON r.companyId = cm.companyId
        WHERE r.id = ? AND cm.userId = ? AND (cm.role = 'WORKER' OR cm.role = 'OWNER')
    `).get(id, userId) as { id: number; companyId: number; workerId: number | null } | undefined;

    if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found or not accessible by this worker.' });
    }

    // Jeśli status to IN_SERVICE, przypisz pracownika do rezerwacji, jeśli nie jest przypisany
    let updateQuery = 'UPDATE reservations SET status = ?';
    const params = [status];

    if (status === 'IN_SERVICE' && reservation.workerId === null) {
        updateQuery += ', workerId = ?';
        params.push(userId);
    }
    updateQuery += ' WHERE id = ?';
    params.push(id);

    const result = db.prepare(updateQuery).run(...params);

    if (result.changes === 0) {
        return res.status(400).json({ error: 'Failed to update reservation status.' });
    }

    res.json({ message: 'Reservation status updated successfully.' });
});

// Pobierz dzisiejszą zmianę
router.get('/shift/today', (req: any, res: any) => {
    const userId = req.session.userId;
    const today = DateTime.now().toFormat('yyyy-MM-dd');

    const shift = db.prepare(`
    SELECT s.id, s.date, s.startTime, s.endTime
    FROM shifts s
    JOIN worker_shifts ws ON ws.shiftId = s.id
    WHERE ws.workerId = ? AND s.date = ?
  `).get(userId, today) as { id: number; date: string; startTime: string; endTime: string } | undefined;

    if (!shift) {
        return res.json({ shift: null });
    }

    // Pobierz przerwy
    const breaks = db.prepare('SELECT startTime, endTime FROM breaks WHERE shiftId = ?').all(shift.id) as Array<{ startTime: string; endTime: string }>;

    // Zakładamy jedną przerwę dla uproszczenia interfejsu, lub bierzemy pierwszą
    const firstBreak = breaks[0];

    res.json({
        shift: {
            ...shift,
            breakStart: firstBreak?.startTime,
            breakEnd: firstBreak?.endTime
        }
    });
});

// Pobierz dane firmy
router.get('/company', (req: any, res: any) => {
    const userId = req.session.userId;

    const company = db.prepare(`
    SELECT c.id, c.name, c.slotMinutes, c.traineeExtraMinutes
    FROM companies c
    JOIN company_members cm ON cm.companyId = c.id
    WHERE cm.userId = ? AND (cm.role = 'WORKER' OR cm.role = 'OWNER')
  `).get(userId);

    if (!company) {
        return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
});

export default router;
