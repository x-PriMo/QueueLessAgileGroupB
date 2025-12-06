import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../lib/db';
import { z } from 'zod';
import { reservationRateLimit } from '../middleware/rateLimit';
import { DateTime } from 'luxon';
import { sendReservationConfirmationEmail, type ReservationEmailData } from '../lib/mailer';
import { generateReservationICS } from '../lib/ics';


const router = Router();

const reservationSchema = z.object({
  companyId: z.number(),
  email: z.string().email(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  serviceId: z.number().optional(),
  workerId: z.number().optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
});

router.post('/', reservationRateLimit, async (req: Request, res: Response) => {
  try {
    const parsed = reservationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { companyId, email, date, startTime, serviceId, workerId: requestedWorkerId, customerName, phone } = parsed.data;

    // Walidacja daty/godziny przez Luxon
    const dt = DateTime.fromISO(`${date}T${startTime}:00`);
    if (!dt.isValid) {
      return res.status(400).json({ error: 'Invalid date/time' });
    }

    // Oblicz czas zakończenia na podstawie usługi
    let endTime = startTime;
    let serviceDuration = 30; // domyślnie 30 minut
    let serviceName = 'Usługa';
    let servicePrice = 0;

    if (serviceId) {
      const service = db.prepare('SELECT name, durationMinutes, price FROM services WHERE id = ? AND companyId = ? AND isActive = 1')
        .get(serviceId, companyId) as { name: string; durationMinutes: number; price: number } | undefined;

      if (service) {
        serviceDuration = service.durationMinutes;
        serviceName = service.name;
        servicePrice = service.price;

        const startDt = DateTime.fromFormat(startTime, 'HH:mm');
        const endDt = startDt.plus({ minutes: serviceDuration });
        endTime = endDt.toFormat('HH:mm');
      }
    }

    // Auto-przydział pracownika jeśli nie wybrano
    let finalWorkerId = requestedWorkerId;
    if (!finalWorkerId && serviceId) {
      // Znajdź pracowników wykonujących tę usługę
      const availableWorkers = db.prepare(`
        SELECT cm.userId, 
          (SELECT COUNT(*) FROM reservations r WHERE r.workerId = cm.userId AND r.date = ? AND r.status != 'CANCELLED') as load
        FROM company_members cm
        JOIN worker_services ws ON ws.workerId = cm.userId AND ws.serviceId = ?
        WHERE cm.companyId = ? AND cm.canServe = 1
        ORDER BY load ASC
        LIMIT 1
      `).get(date, serviceId, companyId) as { userId: number; load: number } | undefined;

      if (availableWorkers) {
        finalWorkerId = availableWorkers.userId;
      }
    }

    // Sprawdź czy firma ma autoAccept
    const company = db.prepare('SELECT name, autoAccept, timezone FROM companies WHERE id = ?')
      .get(companyId) as { name: string; autoAccept: number; timezone: string } | undefined;

    const status = company?.autoAccept ? 'ACCEPTED' : 'PENDING';
    // const timezone = company?.timezone || 'Europe/Warsaw';

    // Wstaw rezerwację wraz z opcjonalnymi polami serviceId/workerId/customerName/phone
    const info = db.prepare(
      `INSERT INTO reservations (companyId, email, date, startTime, status, serviceId, workerId, customerName, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      companyId,
      email.toLowerCase(),
      date,
      startTime,
      status,
      serviceId ?? null,
      finalWorkerId ?? null,
      customerName ?? null,
      phone ?? null
    );

    const reservationId = info.lastInsertRowid as number;

    // Pobierz dane firmy dla emaila
    const companyData = db.prepare(`
      SELECT c.name as companyName, c.timezone, c.contactEmail, m.description as companyAddress
      FROM companies c
      LEFT JOIN company_meta m ON m.companyId = c.id
      WHERE c.id = ?
    `).get(companyId) as { companyName: string; timezone: string; contactEmail: string; companyAddress?: string } | undefined;

    // Wyślij email asynchronicznie (nie blokuje rezerwacji)
    if (companyData) {
      setImmediate(async () => {
        try {
          const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservations/${reservationId}/cancel`;

          // Generuj ICS
          const icsContent = generateReservationICS(
            serviceName,
            companyData.companyName,
            companyData.companyAddress || null,
            companyData.contactEmail || 'noreply@queueless.local',
            email,
            customerName || null,
            date,
            startTime,
            endTime,
            companyData.timezone,
            `Rezerwacja: ${serviceName} w ${companyData.companyName}`
          );

          await sendReservationConfirmationEmail({
            reservationId,
            customerEmail: email,
            customerName: customerName,
            companyName: companyData.companyName,
            companyAddress: companyData.companyAddress,
            serviceName: serviceName,
            serviceDuration: serviceDuration,
            servicePrice: servicePrice,
            reservationDate: date,
            reservationStartTime: startTime,
            reservationEndTime: endTime,
            companyTimezone: companyData.timezone,
            cancelUrl: cancelUrl,
            icsContent: icsContent
          });

          // Zaloguj wysłanie emaila
          db.prepare(`
            INSERT INTO email_logs (reservationId, emailType, recipientEmail, subject, status, messageId)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(reservationId, 'CONFIRMATION', email, `Potwierdzenie rezerwacji - ${serviceName}`, 'SENT', 'email-sent');

        } catch (emailError) {
          console.error('Błąd podczas wysyłania emaila:', emailError);

          // Zaloguj błąd
          db.prepare(`
            INSERT INTO email_logs (reservationId, emailType, recipientEmail, subject, status, errorMessage)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(reservationId, 'CONFIRMATION', email, `Potwierdzenie rezerwacji - ${serviceName}`, 'FAILED', emailError instanceof Error ? emailError.message : 'Unknown error');
        }
      });
    }

    res.status(201).json({
      id: reservationId,
      status: status.toLowerCase(),
      message: status === 'ACCEPTED' ? 'Rezerwacja została potwierdzona' : 'Rezerwacja oczekuje na potwierdzenie'
    });

  } catch (error) {
    console.error('Błąd podczas tworzenia rezerwacji:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas tworzenia rezerwacji' });
  }
});

router.get('/my', (req: Request, res: Response) => {
  // Sprawdź czy użytkownik jest zalogowany (sesja)
  if (!req.session || !req.session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.user.id) as { email: string } | undefined;

    if (!userEmail) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reservations = db.prepare(`
      SELECT 
        r.id, 
        c.name as companyName, 
        r.date, 
        r.startTime, 
        r.status,
        s.name as serviceName
      FROM reservations r
      JOIN companies c ON c.id = r.companyId
      LEFT JOIN services s ON s.id = r.serviceId
      WHERE r.email = ?
      ORDER BY r.date DESC, r.startTime DESC
    `).all(userEmail.email);

    res.json({ reservations });
  } catch (error) {
    console.error('Błąd pobierania rezerwacji użytkownika:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { authGuard, memberGuard } from '../middleware/auth';

// ...

router.get('/company/:companyId', authGuard, memberGuard('companyId'), (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  // Zwracamy tylko niezbędne dane dla widoku kalendarza/listy
  // Jeśli to Owner/Worker, mogą widzieć więcej.
  // Ale ten endpoint zwraca wszystko.
  // memberGuard zapewnia, że tylko pracownicy/właściciele tej firmy mają dostęp.

  const rows = db
    .prepare(`
      SELECT 
        r.id, r.email, r.customerName, r.phone, r.date, r.startTime, r.status, 
        r.serviceId, s.name as serviceName, s.durationMinutes, s.price,
        r.workerId, u.email as workerFirstName, '' as workerLastName
      FROM reservations r
      LEFT JOIN services s ON s.id = r.serviceId
      LEFT JOIN users u ON u.id = r.workerId
      WHERE r.companyId = ? 
      ORDER BY r.date, r.startTime
    `)
    .all(companyId);

  console.log(`[GET /reservations/company/${companyId}] Found ${rows.length} reservations`);
  res.json({ reservations: rows });
});

// PUT /reservations/:id/reschedule - Reschedule a reservation to a new date/time
router.put('/:id/reschedule', async (req: Request, res: Response) => {
  const reservationId = Number(req.params.id);
  const { newDate, newStartTime, newWorkerId } = req.body;

  if (!newDate || !newStartTime) {
    return res.status(400).json({ error: 'newDate and newStartTime are required' });
  }

  try {
    // Get the existing reservation
    const reservation = db.prepare(`
      SELECT r.*, c.name as companyName, c.autoAccept, c.timezone, s.name as serviceName, s.durationMinutes,
             u.email as userEmail
      FROM reservations r
      JOIN companies c ON c.id = r.companyId
      LEFT JOIN services s ON s.id = r.serviceId
      LEFT JOIN users u ON u.id = ?
      WHERE r.id = ?
    `).get(req.session?.userId || 0, reservationId) as {
      id: number;
      email: string;
      companyId: number;
      companyName: string;
      serviceId: number;
      serviceName: string;
      durationMinutes: number;
      workerId: number;
      date: string;
      startTime: string;
      status: string;
      autoAccept: number;
      timezone: string;
      userEmail: string;
    } | undefined;

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify permission: only the customer who made the reservation can reschedule it
    // Or if logged in, the email must match
    if (req.session?.user?.id) {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.user.id) as { email: string } | undefined;
      if (!user || user.email !== reservation.email) {
        return res.status(403).json({ error: 'Forbidden: You can only reschedule your own reservations' });
      }
    }

    // Validate new date/time is in the future
    const newDateTime = DateTime.fromISO(`${newDate}T${newStartTime}:00`);
    if (!newDateTime.isValid || newDateTime < DateTime.now()) {
      return res.status(400).json({ error: 'New date/time must be in the future' });
    }

    // Determine final worker for the new slot
    const finalWorkerId = newWorkerId || reservation.workerId;

    // Check if new slot is available using the slots algorithm
    const dayOfWeek = newDateTime.weekday % 7;
    const workingHours = db.prepare(`
      SELECT startTime, endTime, isActive
      FROM working_hours
      WHERE companyId = ? AND dayOfWeek = ?
    `).get(reservation.companyId, dayOfWeek) as { startTime: string; endTime: string; isActive: number } | undefined;

    if (!workingHours || !workingHours.isActive) {
      return res.status(400).json({ error: 'Company is not open on this day' });
    }

    // Calculate end time
    const startDt = DateTime.fromFormat(newStartTime, 'HH:mm');
    const endDt = startDt.plus({ minutes: reservation.durationMinutes });
    const newEndTime = endDt.toFormat('HH:mm');

    // Check if time is within working hours
    if (newStartTime < workingHours.startTime || newEndTime > workingHours.endTime) {
      return res.status(400).json({ error: 'Selected time is outside working hours' });
    }

    // Check for conflicts with existing reservations (excluding this one)
    const conflicts = db.prepare(`
      SELECT r.id
      FROM reservations r
      JOIN services s ON s.id = r.serviceId
      WHERE r.companyId = ?
      AND r.date = ?
      AND r.workerId = ?
      AND r.status IN ('PENDING', 'ACCEPTED')
      AND r.id != ?
      AND (
        (r.startTime < ? AND 
         datetime(r.date || ' ' || r.startTime, '+' || s.durationMinutes || ' minutes') > datetime(? || ' ' || ?))
      )
    `).all(reservation.companyId, newDate, finalWorkerId, reservationId, newEndTime, newDate, newStartTime);

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'The new time slot conflicts with an existing reservation' });
    }

    // Check for break conflicts
    const workerShift = db.prepare(`
      SELECT s.id as shiftId, s.startTime, s.endTime
      FROM shifts s
      JOIN worker_shifts ws ON ws.shiftId = s.id
      WHERE s.companyId = ? AND s.date = ? AND ws.workerId = ?
      LIMIT 1
    `).get(reservation.companyId, newDate, finalWorkerId) as { shiftId: number; startTime: string; endTime: string } | undefined;

    if (workerShift) {
      const breakConflicts = db.prepare(`
        SELECT id FROM breaks
        WHERE shiftId = ?
        AND (startTime < ? AND endTime > ?)
      `).all(workerShift.shiftId, newEndTime, newStartTime);

      if (breakConflicts.length > 0) {
        return res.status(409).json({ error: 'The new time slot conflicts with a worker break' });
      }
    }

    // Store old values for email notification
    const oldDate = reservation.date;
    const oldStartTime = reservation.startTime;

    // Update the reservation
    db.prepare(`
      UPDATE reservations
      SET date = ?, startTime = ?, workerId = ?, status = ?
      WHERE id = ?
    `).run(newDate, newStartTime, finalWorkerId, reservation.autoAccept ? 'ACCEPTED' : 'PENDING', reservationId);

    // Send reschedule notification email
    try {
      const icsContent = generateReservationICS(
        reservation.serviceName,
        reservation.companyName,
        null, // companyAddress - not available in this context
        'noreply@queueless.local', // companyEmail
        reservation.email,
        reservation.userEmail || null,
        newDate,
        newStartTime,
        newEndTime,
        reservation.timezone,
        `Rezerwacja zmieniona z ${oldDate} ${oldStartTime} na ${newDate} ${newStartTime}`
      );

      const emailData: ReservationEmailData = {
        reservationId,
        customerEmail: reservation.email,
        customerName: reservation.userEmail || undefined,
        companyName: reservation.companyName,
        serviceName: reservation.serviceName,
        serviceDuration: reservation.durationMinutes,
        servicePrice: 0, // Price info not available in reservation record
        reservationDate: newDate,
        reservationStartTime: newStartTime,
        reservationEndTime: newEndTime,
        companyTimezone: reservation.timezone,
        icsContent
      };

      await sendReservationConfirmationEmail(emailData);
    } catch (emailError) {
      console.error('Failed to send reschedule notification email:', emailError);
      // Don't fail the request if email fails
    }


    // Fetch and return updated reservation
    const updatedReservation = db.prepare(`
      SELECT r.*, c.name as companyName, s.name as serviceName
      FROM reservations r
      JOIN companies c ON c.id = r.companyId
      LEFT JOIN services s ON s.id = r.serviceId
      WHERE r.id = ?
    `).get(reservationId);

    res.json({
      message: 'Reservation rescheduled successfully',
      reservation: updatedReservation
    });
  } catch (error) {
    console.error('Error rescheduling reservation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

