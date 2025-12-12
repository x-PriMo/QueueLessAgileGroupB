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
    const userId = req.session.user?.id;
    // Allow date from query param, default to today
    const dateParam = req.query.date as string;
    const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : DateTime.now().toFormat('yyyy-MM-dd');

    // Pobierz firmę pracownika
    // FIX: Use single quotes for string literals in SQL
    const member = db.prepare("SELECT companyId FROM company_members WHERE userId = ? AND (role = 'WORKER' OR role = 'OWNER')").get(userId) as { companyId: number } | undefined;

    if (!member) {
        return res.status(404).json({ error: 'Worker not assigned to any company' });
    }

    // Pobierz rezerwacje:
    // 1. Przypisane do tego pracownika na wybraną datę
    // 2. LUB nieprzypisane (workerId IS NULL) w tej firmie na wybraną datę
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
      AND r.status IN ('ACCEPTED', 'IN_SERVICE', 'PENDING')
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

        let status = item.status;
        // Map ACCEPTED to WAITING for frontend compatibility (Ready to serve)
        if (status === 'ACCEPTED') status = 'WAITING';
        // PENDING remains PENDING
        // IN_SERVICE remains IN_SERVICE

        return {
            id: item.id,
            customerEmail: item.customerEmail,
            startTime: item.startTime,
            estimatedEndTime: endDt.toFormat('HH:mm'),
            status: status,
            isTrainee: false
        };
    });

    // Pobierz też zakończone w wybranym dniu
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
    ORDER BY r.startTime DESC
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
    const userId = req.session.user?.id;

    // Sprawdź, czy rezerwacja należy do firmy pracownika
    const reservation = db.prepare(`
        SELECT r.id, r.companyId, r.workerId, r.status, c.workersCanAccept
        FROM reservations r
        JOIN company_members cm ON r.companyId = cm.companyId
        JOIN companies c ON c.id = r.companyId
        WHERE r.id = ? AND cm.userId = ? AND (cm.role = 'WORKER' OR cm.role = 'OWNER')
    `).get(id, userId) as { id: number; companyId: number; workerId: number | null; status: string; workersCanAccept: number } | undefined;

    if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found or not accessible by this worker.' });
    }

    // Check permission if trying to start a PENDING reservation
    if (reservation.status === 'PENDING' && status === 'IN_SERVICE') {
        if (!reservation.workersCanAccept) {
            // Check if user is OWNER (owners can always accept)
            const isOwner = db.prepare('SELECT role FROM company_members WHERE companyId = ? AND userId = ?').get(reservation.companyId, userId) as { role: string };
            if (isOwner.role !== 'OWNER') {
                return res.status(403).json({ error: 'Workers are not allowed to accept reservations.' });
            }
        }
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

// ... (shift endpoint unchanged)

// Pobierz dane firmy
router.get('/company', (req: any, res: any) => {
    const userId = req.session.user?.id;

    const company = db.prepare(`
    SELECT c.id, c.name, c.slotMinutes, c.traineeExtraMinutes, c.workersCanAccept, cm.role as userRole
    FROM companies c
    JOIN company_members cm ON cm.companyId = c.id
    WHERE cm.userId = ? AND (cm.role = 'WORKER' OR cm.role = 'OWNER')
  `).get(userId);

    if (!company) {
        return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
});

// ===== BREAKS MANAGEMENT ENDPOINTS =====

// GET /worker/breaks?shiftId=:id - Get all breaks for a shift
router.get('/breaks', authGuard, (req: Request, res: Response) => {
    const { shiftId } = req.query;
    const userId = req.session?.user?.id;

    if (!shiftId) {
        return res.status(400).json({ error: 'shiftId is required' });
    }

    // Verify user has access to this shift (either as worker or owner)
    const shift = db.prepare(`
        SELECT s.*, cm.role
        FROM shifts s
        JOIN worker_shifts ws ON ws.shiftId = s.id
        JOIN company_members cm ON cm.companyId = s.companyId AND cm.userId = ?
        WHERE s.id = ? AND (ws.workerId = ? OR cm.role = 'OWNER')
        LIMIT 1
    `).get(userId, shiftId, userId) as { id: number; date: string; startTime: string; endTime: string; role: string } | undefined;

    if (!shift) {
        return res.status(403).json({ error: 'Access denied to this shift' });
    }

    const breaks = db.prepare(`
        SELECT id, shiftId, startTime, endTime
        FROM breaks
        WHERE shiftId = ?
        ORDER BY startTime
    `).all(shiftId) as Array<{ id: number; shiftId: number; startTime: string; endTime: string }>;

    res.json({ breaks });
});

// POST /worker/breaks - Create a new break
router.post('/breaks', authGuard, (req: Request, res: Response) => {
    const { shiftId, startTime, endTime } = req.body;
    const userId = req.session?.user?.id;

    if (!shiftId || !startTime || !endTime) {
        return res.status(400).json({ error: 'shiftId, startTime, and endTime are required' });
    }

    // Verify user has access to this shift (owner only can manage breaks)
    const shift = db.prepare(`
        SELECT s.*, cm.role
        FROM shifts s
        JOIN company_members cm ON cm.companyId = s.companyId AND cm.userId = ?
        WHERE s.id = ?
        LIMIT 1
    `).get(userId, shiftId) as { id: number; companyId: number; date: string; startTime: string; endTime: string; role: string } | undefined;

    if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
    }

    if (shift.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owners can manage breaks' });
    }

    // Validate: break must be within shift hours
    if (startTime < shift.startTime || endTime > shift.endTime) {
        return res.status(400).json({ error: 'Break must be within shift hours' });
    }

    // Validate: startTime must be before endTime
    if (startTime >= endTime) {
        return res.status(400).json({ error: 'Break start time must be before end time' });
    }

    // Check for overlapping breaks
    const overlappingBreaks = db.prepare(`
        SELECT id FROM breaks
        WHERE shiftId = ?
        AND (
            (startTime < ? AND endTime > ?)
            OR (startTime < ? AND endTime > ?)
            OR (startTime >= ? AND endTime <= ?)
        )
    `).all(shiftId, endTime, startTime, endTime, startTime, startTime, endTime);

    if (overlappingBreaks.length > 0) {
        return res.status(409).json({ error: 'Break overlaps with existing break' });
    }

    // Check for conflicts with accepted reservations
    const conflictingReservations = db.prepare(`
        SELECT r.id
        FROM reservations r
        JOIN services s ON s.id = r.serviceId
        WHERE r.companyId = ?
        AND r.date = ?
        AND r.status IN ('PENDING', 'ACCEPTED')
        AND r.workerId IN (SELECT workerId FROM worker_shifts WHERE shiftId = ?)
        AND (
            (r.startTime < ? AND 
             datetime(r.date || ' ' || r.startTime, '+' || s.durationMinutes || ' minutes') > datetime(? || ' ' || ?))
        )
    `).all(shift.companyId, shift.date, shiftId, endTime, shift.date, startTime);

    if (conflictingReservations.length > 0) {
        return res.status(409).json({ error: 'Break conflicts with existing reservations' });
    }

    // Insert the break
    const result = db.prepare(`
        INSERT INTO breaks (shiftId, startTime, endTime)
        VALUES (?, ?, ?)
    `).run(shiftId, startTime, endTime);

    const newBreak = db.prepare(`
        SELECT id, shiftId, startTime, endTime
        FROM breaks
        WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ break: newBreak });
});

// PUT /worker/breaks/:id - Update a break
router.put('/breaks/:id', authGuard, (req: Request, res: Response) => {
    const breakId = Number(req.params.id);
    const { startTime, endTime } = req.body;
    const userId = req.session?.user?.id;

    if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    // Get the break and verify access
    const breakRecord = db.prepare(`
        SELECT b.*, s.date, s.startTime as shiftStart, s.endTime as shiftEnd, s.companyId, cm.role
        FROM breaks b
        JOIN shifts s ON s.id = b.shiftId
        JOIN company_members cm ON cm.companyId = s.companyId AND cm.userId = ?
        WHERE b.id = ?
    `).get(userId, breakId) as {
        id: number; shiftId: number; startTime: string; endTime: string;
        date: string; shiftStart: string; shiftEnd: string; companyId: number; role: string
    } | undefined;

    if (!breakRecord) {
        return res.status(404).json({ error: 'Break not found' });
    }

    if (breakRecord.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owners can manage breaks' });
    }

    // Validate: break must be within shift hours
    if (startTime < breakRecord.shiftStart || endTime > breakRecord.shiftEnd) {
        return res.status(400).json({ error: 'Break must be within shift hours' });
    }

    // Validate: startTime must be before endTime
    if (startTime >= endTime) {
        return res.status(400).json({ error: 'Break start time must be before end time' });
    }

    // Check for overlapping breaks (excluding this one)
    const overlappingBreaks = db.prepare(`
        SELECT id FROM breaks
        WHERE shiftId = ? AND id != ?
        AND (
            (startTime < ? AND endTime > ?)
            OR (startTime < ? AND endTime > ?)
            OR (startTime >= ? AND endTime <= ?)
        )
    `).all(breakRecord.shiftId, breakId, endTime, startTime, endTime, startTime, startTime, endTime);

    if (overlappingBreaks.length > 0) {
        return res.status(409).json({ error: 'Break overlaps with existing break' });
    }

    // Update the break
    db.prepare(`
        UPDATE breaks
        SET startTime = ?, endTime = ?
        WHERE id = ?
    `).run(startTime, endTime, breakId);

    const updatedBreak = db.prepare(`
        SELECT id, shiftId, startTime, endTime
        FROM breaks
        WHERE id = ?
    `).get(breakId);

    res.json({ break: updatedBreak });
});

// DELETE /worker/breaks/:id - Delete a break
router.delete('/breaks/:id', authGuard, (req: Request, res: Response) => {
    const breakId = Number(req.params.id);
    const userId = req.session?.user?.id;

    // Get the break and verify access
    const breakRecord = db.prepare(`
        SELECT b.*, cm.role
        FROM breaks b
        JOIN shifts s ON s.id = b.shiftId
        JOIN company_members cm ON cm.companyId = s.companyId AND cm.userId = ?
        WHERE b.id = ?
    `).get(userId, breakId) as { id: number; shiftId: number; role: string } | undefined;

    if (!breakRecord) {
        return res.status(404).json({ error: 'Break not found' });
    }

    if (breakRecord.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owners can manage breaks' });
    }

    // Delete the break
    db.prepare('DELETE FROM breaks WHERE id = ?').run(breakId);

    res.json({ message: 'Break deleted successfully' });
});

export default router;

