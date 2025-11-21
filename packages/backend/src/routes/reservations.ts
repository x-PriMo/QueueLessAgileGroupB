import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../lib/db';
import { z } from 'zod';
import { reservationRateLimit } from '../middleware/rateLimit';
import { DateTime } from 'luxon';
import { sendReservationConfirmationEmail } from '../lib/mailer';
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

router.post('/', reservationRateLimit, async (req: any, res: any) => {
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
    const timezone = company?.timezone || 'Europe/Warsaw';

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

router.get('/my', (req: any, res: any) => {
  // Sprawdź czy użytkownik jest zalogowany (sesja)
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId) as { email: string } | undefined;

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

router.get('/company/:companyId', authGuard, memberGuard('companyId'), (req: any, res: any) => {
  const companyId = Number(req.params.companyId);
  // Zwracamy tylko niezbędne dane dla widoku kalendarza/listy
  // Jeśli to Owner/Worker, mogą widzieć więcej.
  // Ale ten endpoint zwraca wszystko.
  // memberGuard zapewnia, że tylko pracownicy/właściciele tej firmy mają dostęp.

  const rows = db
    .prepare(
      'SELECT id, email, customerName, phone, date, startTime, status, serviceId, workerId FROM reservations WHERE companyId = ? ORDER BY date, startTime'
    )
    .all(companyId);
  res.json({ reservations: rows });
});

export default router;
