import { Router, Request, Response, NextFunction } from 'express';
import db from '../lib/db';
import { z } from 'zod';
import { authGuard, memberGuard, roleGuard } from '../middleware/auth';
import { DateTime } from 'luxon';

const router = Router();

// Schematy walidacji
const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true)
});

// Pobierz wszystkie usługi dla firmy
router.get('/companies/:companyId/services', (req: Request, res: Response) => {
  const { companyId } = req.params;
  
  const services = db.prepare(`
    SELECT id, companyId, name, durationMinutes, price, description, isActive, createdAt, updatedAt
    FROM services 
    WHERE companyId = ? AND isActive = 1
    ORDER BY name
  `).all(companyId);
  
  res.json({ services });
});

// Pobierz szczegóły usługi
router.get('/companies/:companyId/services/:serviceId', (req: Request, res: Response) => {
  const { companyId, serviceId } = req.params;
  
  const service = db.prepare(`
    SELECT id, companyId, name, durationMinutes, price, description, isActive, createdAt, updatedAt
    FROM services 
    WHERE id = ? AND companyId = ? AND isActive = 1
  `).get(serviceId, companyId);
  
  if (!service) {
    return res.status(404).json({ error: 'Usługa nie znaleziona' });
  }
  
  res.json({ service });
});

// Utwórz nową usługę (tylko właściciel)
router.post('/companies/:companyId/services', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId } = req.params;
    
    try {
      const data = serviceSchema.parse(req.body);
      
      const result = db.prepare(`
        INSERT INTO services (companyId, name, durationMinutes, price, description, isActive)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.name,
        data.durationMinutes,
        data.price,
        data.description || null,
        data.isActive ? 1 : 0
      );
      
      const service = db.prepare(`
        SELECT id, companyId, name, durationMinutes, price, description, isActive, createdAt, updatedAt
        FROM services 
        WHERE id = ?
      `).get(result.lastInsertRowid);
      
      res.status(201).json({ service });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Nieprawidłowe dane', details: error.errors });
      }
      throw error;
    }
  }
);

// Aktualizuj usługę (tylko właściciel)
router.put('/companies/:companyId/services/:serviceId', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId, serviceId } = req.params;
    
    try {
      const data = serviceSchema.parse(req.body);
      
      const result = db.prepare(`
        UPDATE services 
        SET name = ?, durationMinutes = ?, price = ?, description = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND companyId = ?
      `).run(
        data.name,
        data.durationMinutes,
        data.price,
        data.description || null,
        data.isActive ? 1 : 0,
        serviceId,
        companyId
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Usługa nie znaleziona' });
      }
      
      const service = db.prepare(`
        SELECT id, companyId, name, durationMinutes, price, description, isActive, createdAt, updatedAt
        FROM services 
        WHERE id = ?
      `).get(serviceId);
      
      res.json({ service });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Nieprawidłowe dane', details: error.errors });
      }
      throw error;
    }
  }
);

// Usuń usługę (tylko właściciel) - soft delete
router.delete('/companies/:companyId/services/:serviceId', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId, serviceId } = req.params;
    
    const result = db.prepare(`
      UPDATE services 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND companyId = ?
    `).run(serviceId, companyId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usługa nie znaleziona' });
    }
    
    res.status(204).send();
  }
);

// Pobierz usługi przypisane do pracownika
router.get('/companies/:companyId/workers/:workerId/services', (req: Request, res: Response) => {
  const { companyId, workerId } = req.params;
  
  const services = db.prepare(`
    SELECT s.id, s.companyId, s.name, s.durationMinutes, s.price, s.description, s.isActive
    FROM services s
    JOIN worker_services ws ON ws.serviceId = s.id
    WHERE ws.workerId = ? AND s.companyId = ? AND s.isActive = 1 AND ws.canPerform = 1
    ORDER BY s.name
  `).all(workerId, companyId);
  
  res.json({ services });
});

// Przypisz usługę do pracownika (tylko właściciel)
router.post('/companies/:companyId/workers/:workerId/services/:serviceId', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId, workerId, serviceId } = req.params;
    
    // Sprawdź czy usługa należy do firmy
    const service = db.prepare(`
      SELECT id FROM services WHERE id = ? AND companyId = ? AND isActive = 1
    `).get(serviceId, companyId);
    
    if (!service) {
      return res.status(404).json({ error: 'Usługa nie znaleziona' });
    }
    
    // Sprawdź czy pracownik należy do firmy
    const worker = db.prepare(`
      SELECT userId FROM company_members WHERE userId = ? AND companyId = ? AND role IN ('WORKER', 'OWNER')
    `).get(workerId, companyId);
    
    if (!worker) {
      return res.status(404).json({ error: 'Pracownik nie znaleziony' });
    }
    
    try {
      db.prepare(`
        INSERT INTO worker_services (workerId, serviceId, canPerform)
        VALUES (?, ?, 1)
        ON CONFLICT(workerId, serviceId) DO UPDATE SET canPerform = 1
      `).run(workerId, serviceId);
      
      res.status(201).json({ message: 'Usługa przypisana do pracownika' });
    } catch (error) {
      res.status(500).json({ error: 'Błąd podczas przypisywania usługi' });
    }
  }
);

// Usuń przypisanie usługi do pracownika (tylko właściciel)
router.delete('/companies/:companyId/workers/:workerId/services/:serviceId', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId, workerId, serviceId } = req.params;
    
    const result = db.prepare(`
      DELETE FROM worker_services 
      WHERE workerId = ? AND serviceId = ?
      AND EXISTS (
        SELECT 1 FROM services WHERE id = ? AND companyId = ?
      )
    `).run(workerId, serviceId, serviceId, companyId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Przypisanie nie znalezione' });
    }
    
    res.status(204).send();
  }
);

// Algorytm wolnych slotów czasowych
router.get('/companies/:companyId/services/:serviceId/slots', (req: Request, res: Response) => {
  const { companyId, serviceId } = req.params;
  const { date, workerId } = req.query as { date?: string; workerId?: string };
  
  if (!date) {
    return res.status(400).json({ error: 'Data jest wymagana' });
  }
  
  // Sprawdź czy usługa istnieje i należy do firmy
  const service = db.prepare(`
    SELECT id, durationMinutes FROM services 
    WHERE id = ? AND companyId = ? AND isActive = 1
  `).get(serviceId, companyId) as { id: number; durationMinutes: number } | undefined;
  
  if (!service) {
    return res.status(404).json({ error: 'Usługa nie znaleziona' });
  }
  
  const serviceDuration = service.durationMinutes;
  const targetDate = DateTime.fromISO(date);
  const dayOfWeek = targetDate.weekday % 7; // Luxon: 1-7, SQLite: 0-6
  
  // Pobierz godziny pracy firmy dla tego dnia
  const workingHours = db.prepare(`
    SELECT startTime, endTime, isActive
    FROM working_hours
    WHERE companyId = ? AND dayOfWeek = ?
  `).get(companyId, dayOfWeek) as { startTime: string; endTime: string; isActive: number } | undefined;
  
  if (!workingHours || !workingHours.isActive) {
    return res.json({ slots: [] }); // Firma nie pracuje w ten dzień
  }
  
  const workStart = DateTime.fromISO(`${date}T${workingHours.startTime}`);
  const workEnd = DateTime.fromISO(`${date}T${workingHours.endTime}`);
  
  // Pobierz pracowników firmy
  let workersQuery = `
    SELECT u.id, u.email as name, cm.role, u.isTrainee
    FROM users u
    JOIN company_members cm ON cm.userId = u.id
    WHERE cm.companyId = ? AND cm.role IN ('WORKER', 'OWNER') AND u.canServe = 1
  `;
  
  const workersParams = [companyId];
  
  if (workerId && workerId !== 'any') {
    workersQuery += ' AND u.id = ?';
    workersParams.push(workerId);
  }
  
  const workers = db.prepare(workersQuery).all(...workersParams) as Array<{
    id: number;
    name: string;
    role: string;
    isTrainee: number;
  }>;
  
  if (workers.length === 0) {
    return res.json({ slots: [] }); // Brak dostępnych pracowników
  }
  
  // Pobierz zmiany pracowników dla danego dnia
  const workerIds = workers.map(w => w.id);
  const shifts = db.prepare(`
    SELECT id, date, startTime, endTime
    FROM shifts
    WHERE companyId = ? AND date = ? AND id IN (
      SELECT DISTINCT shiftId FROM worker_shifts WHERE workerId IN (${workerIds.map(() => '?').join(',')})
    )
  `).all(companyId, date, ...workerIds) as Array<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  
  // Pobierz przerwy dla zmian
  const shiftIds = shifts.map(s => s.id);
  let breaks: Array<{ shiftId: number; startTime: string; endTime: string }> = [];
  
  if (shiftIds.length > 0) {
    breaks = db.prepare(`
      SELECT shiftId, startTime, endTime
      FROM breaks
      WHERE shiftId IN (${shiftIds.map(() => '?').join(',')})
    `).all(...shiftIds) as Array<{ shiftId: number; startTime: string; endTime: string }>;
  }
  
  // Pobierz istniejące rezerwacje dla danego dnia
  const reservations = db.prepare(`
    SELECT r.id, r.workerId, r.startTime, s.durationMinutes,
           CASE WHEN u.isTrainee = 1 THEN s.durationMinutes + c.traineeExtraMinutes 
                ELSE s.durationMinutes END as totalDuration
    FROM reservations r
    JOIN services s ON s.id = r.serviceId
    JOIN companies c ON c.id = r.companyId
    JOIN users u ON u.id = r.workerId
    WHERE r.companyId = ? AND r.date = ? AND r.status IN ('PENDING', 'ACCEPTED')
  `).all(companyId, date) as Array<{
    id: number;
    workerId: number;
    startTime: string;
    durationMinutes: number;
    totalDuration: number;
  }>;
  
  // Generuj sloty co 15 minut
  const slots = [];
  const slotInterval = 15; // minuty
  
  for (let slotStart = workStart; slotStart < workEnd; slotStart = slotStart.plus({ minutes: slotInterval })) {
    const slotEnd = slotStart.plus({ minutes: serviceDuration });
    
    if (slotEnd > workEnd) break; // Slot wychodzi poza godziny pracy
    
    const slotStartTime = slotStart.toFormat('HH:mm');
    const slotEndTime = slotEnd.toFormat('HH:mm');
    
    // Znajdź dostępnych pracowników dla tego slotu
    const availableWorkers = workers.filter(worker => {
      // Sprawdź czy pracownik może wykonywać tę usługę
      const canPerformService = db.prepare(`
        SELECT 1 FROM worker_services 
        WHERE workerId = ? AND serviceId = ? AND canPerform = 1
      `).get(worker.id, serviceId);
      
      if (!canPerformService) return false;
      
      // Sprawdź czy pracownik ma zmianę w tym czasie
      const workerShift = shifts.find(shift => {
        const shiftStart = DateTime.fromISO(`${date}T${shift.startTime}`);
        const shiftEnd = DateTime.fromISO(`${date}T${shift.endTime}`);
        return slotStart >= shiftStart && slotEnd <= shiftEnd;
      });
      
      if (!workerShift) return false;
      
      // Sprawdź przerwy
      const workerBreaks = breaks.filter(b => b.shiftId === workerShift.id);
      const hasBreakConflict = workerBreaks.some(break_ => {
        const breakStart = DateTime.fromISO(`${date}T${break_.startTime}`);
        const breakEnd = DateTime.fromISO(`${date}T${break_.endTime}`);
        return slotStart < breakEnd && slotEnd > breakStart; // Nakładanie się
      });
      
      if (hasBreakConflict) return false;
      
      // Sprawdź konflikt z istniejącymi rezerwacjami
      const workerReservations = reservations.filter(r => r.workerId === worker.id);
      const hasReservationConflict = workerReservations.some(reservation => {
        const resStart = DateTime.fromISO(`${date}T${reservation.startTime}`);
        const resEnd = resStart.plus({ minutes: reservation.totalDuration });
        return slotStart < resEnd && slotEnd > resStart; // Nakładanie się
      });
      
      if (hasReservationConflict) return false;
      
      return true;
    });
    
    if (availableWorkers.length > 0) {
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        availableWorkers: availableWorkers.map(w => ({
          id: w.id,
          name: w.name,
          role: w.role,
          isTrainee: Boolean(w.isTrainee)
        })),
        isAvailable: true
      });
    } else {
      // Slot niedostępny - zaznacz jako wyszarzony
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        availableWorkers: [],
        isAvailable: false
      });
    }
  }
  
  res.json({ 
    slots,
    serviceDuration,
    workingHours: {
      start: workingHours.startTime,
      end: workingHours.endTime
    }
  });
});

// Endpointy dla zmian pracowników

// Pobierz zmiany dla firmy w danym dniu
router.get('/companies/:companyId/shifts', (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: 'Data jest wymagana' });
  }
  
  const shifts = db.prepare(`
    SELECT s.id, s.date, s.startTime, s.endTime, GROUP_CONCAT(u.email) as workerNames
    FROM shifts s
    JOIN worker_shifts ws ON ws.shiftId = s.id
    JOIN users u ON u.id = ws.workerId
    WHERE s.companyId = ? AND s.date = ?
    GROUP BY s.id
    ORDER BY s.startTime
  `).all(companyId, date);
  
  res.json({ shifts });
});

// Utwórz zmianę dla pracownika (tylko właściciel)
router.post('/companies/:companyId/workers/:workerId/shifts', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'),
  (req: Request, res: Response) => {
    const { companyId, workerId } = req.params;
    const { date, startTime, endTime } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Data, godzina rozpoczęcia i zakończenia są wymagane' });
    }
    
    // Sprawdź czy pracownik należy do firmy
    const worker = db.prepare(`
      SELECT userId FROM company_members 
      WHERE userId = ? AND companyId = ? AND role IN ('WORKER', 'OWNER')
    `).get(workerId, companyId);
    
    if (!worker) {
      return res.status(404).json({ error: 'Pracownik nie znaleziony' });
    }
    
    try {
      // Utwórz zmianę
      const shiftResult = db.prepare(`
        INSERT INTO shifts (companyId, date, startTime, endTime)
        VALUES (?, ?, ?, ?)
      `).run(companyId, date, startTime, endTime);
      
      // Przypisz pracownika do zmiany
      db.prepare(`
        INSERT INTO worker_shifts (workerId, shiftId)
        VALUES (?, ?)
      `).run(workerId, shiftResult.lastInsertRowid);
      
      const shift = db.prepare(`
        SELECT s.id, s.date, s.startTime, s.endTime
        FROM shifts s
        WHERE s.id = ?
      `).get(shiftResult.lastInsertRowid);
      
      res.status(201).json({ shift });
    } catch (error) {
      res.status(500).json({ error: 'Błąd podczas tworzenia zmiany' });
    }
  }
);

// Pobierz wszystkie zmiany dla firmy
router.get('/shifts/company/:companyId', authGuard, memberGuard('companyId'), (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  
  const shifts = db.prepare(`
    SELECT s.id, s.date, s.startTime, s.endTime, s.breakStart, s.breakEnd, u.id as workerId, u.email as workerEmail
    FROM shifts s
    JOIN worker_shifts ws ON ws.shiftId = s.id
    JOIN users u ON u.id = ws.workerId
    WHERE s.companyId = ?
    ORDER BY s.date DESC, s.startTime
  `).all(companyId);
  
  res.json({ shifts });
});

// Usuń zmianę
router.delete('/shifts/:shiftId', authGuard, (req: Request, res: Response) => {
  const shiftId = Number(req.params.shiftId);
  const userId = req.session?.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Nieautoryzowany' });
  }
  
  // Sprawdź czy użytkownik ma uprawnienia do usunięcia tej zmiany
  const shift = db.prepare(`
    SELECT s.*, cm.userId, cm.role
    FROM shifts s
    JOIN worker_shifts ws ON ws.shiftId = s.id
    JOIN company_members cm ON cm.userId = ws.workerId
    WHERE s.id = ? AND (cm.userId = ? OR cm.role = 'OWNER')
    LIMIT 1
  `).get(shiftId, userId) as any;
  
  if (!shift) {
    return res.status(404).json({ error: 'Zmiana nie znaleziona lub brak uprawnień' });
  }
  
  try {
    // Usuń powiązania pracowników
    db.prepare('DELETE FROM worker_shifts WHERE shiftId = ?').run(shiftId);
    // Usuń zmianę
    db.prepare('DELETE FROM shifts WHERE id = ?').run(shiftId);
    
    res.json({ message: 'Zmiana usunięta pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania zmiany:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania zmiany' });
  }
});

export default router;