import { Router } from 'express';
import { DateTime } from 'luxon';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';
import { generateICS } from '../lib/ics';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { requireAuth, requireCompanyRole, AuthenticatedRequest, CompanyAuthenticatedRequest } from '../middleware/auth';
import {
  createReservationSchema,
  updateReservationSchema,
  reservationParamsSchema,
  reservationQuerySchema,
  availabilityQuerySchema,
  cancelReservationSchema,
} from '../schemas/reservation';

// Define enums locally since they're not exported from @prisma/client
enum CompanyRole {
  OWNER = 'OWNER',
  WORKER = 'WORKER'
}

// Używamy stałych stringów zamiast enum
const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW'
} as const;

enum AvailabilitySource {
  WORKING_HOURS = 'WORKING_HOURS',
  MANUAL = 'MANUAL'
}

const router = Router();

// Get availability for a company on a specific date
router.get('/availability', validateQuery(availabilityQuerySchema), async (req, res) => {
  try {
    const { companyId, date, duration = 60 } = req.query as any;

    // Get company settings and working hours
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
        workingHours: true,
        workBreaks: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Parse date and get day of week
    const targetDate = DateTime.fromISO(date, { zone: company.timezone || 'Europe/Warsaw' });
    const dayOfWeek = targetDate.weekday === 7 ? 0 : targetDate.weekday; // Convert to 0-6 format

    // Get working hours for this day
    const workingHours = company.workingHours.find((wh: any) => wh.weekday === dayOfWeek);
    if (!workingHours) {
      return res.json({ availableSlots: [] });
    }

    // Get existing reservations for this date
    const existingReservations = await prisma.reservation.findMany({
      where: {
        companyId,
        date,
        status: {
          in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.PENDING],
        },
      },
    });

    // Get work breaks for this day
    const workBreaks = company.workBreaks.filter((wb: any) => wb.weekday === dayOfWeek);

    // Generate available time slots
    const availableSlots = generateAvailableSlots(
      workingHours.openTime,
      workingHours.closeTime,
      duration,
      existingReservations,
      workBreaks,
      company.settings?.slotMinutes || 30, // Use slotMinutes as fallback for booking notice
      targetDate
    );

    return res.json({ availableSlots });
  } catch (error) {
    console.error('Get availability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create reservation
router.post('/', validateBody(createReservationSchema), async (req, res) => {
  try {
    const reservationData = req.body;

    // Validate availability
    const isAvailable = await checkAvailability(
      reservationData.companyId,
      reservationData.date,
      reservationData.startTime,
      reservationData.endTime
    );

    if (!isAvailable) {
      return res.status(400).json({ error: 'Time slot not available' });
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        ...reservationData,
        status: RESERVATION_STATUS.CONFIRMED,
      },
      include: {
        company: {
          include: {
            settings: true,
          },
        },
      },
    });

    // Send confirmation email (if enabled)
    // TODO: Add sendConfirmationEmail field to CompanySettings model
    // if (reservation.company.settings?.sendConfirmationEmail) {
    //   await sendConfirmationEmail(reservation);
    // }

    return res.status(201).json({ reservation });
  } catch (error) {
    console.error('Create reservation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reservations
router.get('/', validateQuery(reservationQuerySchema), async (req, res) => {
  try {
    const { companyId, date, status, customerEmail, page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (companyId) where.companyId = companyId;
    if (date) where.date = date;
    if (status) where.status = status;
    if (customerEmail) where.customerEmail = customerEmail;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reservation by ID
router.get('/:reservationId', validateParams(reservationParamsSchema), async (req, res) => {
  try {
    const { reservationId } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        company: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    return res.json({ reservation });
  } catch (error) {
    console.error('Get reservation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reservation
router.put('/:reservationId',
  requireAuth,
  validateParams(reservationParamsSchema),
  validateBody(updateReservationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { reservationId } = req.params;
      const updateData = req.body;

      // Get existing reservation
      const existingReservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { company: true },
      });

      if (!existingReservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      // Check if user has permission to update
      const hasPermission = await checkReservationPermission(
        req.user!.id,
        existingReservation.companyId,
        CompanyRole.WORKER
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // If time is being changed, validate availability
      if (updateData.date || updateData.startTime || updateData.endTime) {
        const isAvailable = await checkAvailability(
          existingReservation.companyId,
          updateData.date || existingReservation.date,
          updateData.startTime || existingReservation.startTime,
          updateData.endTime || existingReservation.endTime,
          reservationId
        );

        if (!isAvailable) {
          return res.status(400).json({ error: 'Time slot not available' });
        }
      }

      const reservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: updateData,
        include: {
          company: {
            include: {
              settings: true,
            },
          },
        },
      });

      return res.json({ reservation });
    } catch (error) {
      console.error('Update reservation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Cancel reservation
router.post('/:reservationId/cancel',
  validateParams(reservationParamsSchema),
  validateBody(cancelReservationSchema),
  async (req, res) => {
    try {
      const { reservationId } = req.params;
      const { reason } = req.body;

      const reservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: RESERVATION_STATUS.CANCELLED,
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        },
        include: {
          company: {
            include: {
              settings: true,
            },
          },
        },
      });

      // Send cancellation email
      await sendCancellationEmail(reservation);

      res.json({ reservation });
    } catch (error) {
      console.error('Cancel reservation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Helper functions
function generateAvailableSlots(
  startTime: string,
  endTime: string,
  duration: number,
  existingReservations: any[],
  workBreaks: any[],
  minNoticeMinutes: number,
  targetDate: DateTime
): string[] {
  const slots: string[] = [];
  const now = DateTime.now();
  
  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let current = targetDate.set({ hour: startHour, minute: startMinute });
  const end = targetDate.set({ hour: endHour, minute: endMinute });
  
  while (current.plus({ minutes: duration }) <= end) {
    const slotStart = current.toFormat('HH:mm');
    const slotEnd = current.plus({ minutes: duration }).toFormat('HH:mm');
    
    // Check if slot is in the future (considering min notice)
    if (current <= now.plus({ minutes: minNoticeMinutes })) {
      current = current.plus({ minutes: 15 }); // 15-minute intervals
      continue;
    }
    
    // Check if slot conflicts with existing reservations
    const hasConflict = existingReservations.some(reservation => {
      return (
        (slotStart >= reservation.startTime && slotStart < reservation.endTime) ||
        (slotEnd > reservation.startTime && slotEnd <= reservation.endTime) ||
        (slotStart <= reservation.startTime && slotEnd >= reservation.endTime)
      );
    });
    
    // Check if slot conflicts with work breaks
    const hasBreakConflict = workBreaks.some(workBreak => {
      return (
        (slotStart >= workBreak.startTime && slotStart < workBreak.endTime) ||
        (slotEnd > workBreak.startTime && slotEnd <= workBreak.endTime) ||
        (slotStart <= workBreak.startTime && slotEnd >= workBreak.endTime)
      );
    });
    
    if (!hasConflict && !hasBreakConflict) {
      slots.push(slotStart);
    }
    
    current = current.plus({ minutes: 15 }); // 15-minute intervals
  }
  
  return slots;
}

async function checkAvailability(
  companyId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
): Promise<boolean> {
  const where: any = {
    companyId,
    date,
    status: {
        in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.PENDING],
      },
    OR: [
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
    ],
  };

  if (excludeReservationId) {
    where.id = { not: excludeReservationId };
  }

  const conflictingReservation = await prisma.reservation.findFirst({ where });
  return !conflictingReservation;
}

async function checkReservationPermission(
  userId: string,
  companyId: string,
  requiredRole: CompanyRole
): Promise<boolean> {
  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId,
      companyId,
    },
  });

  if (!membership) return false;

  const roleHierarchy = {
      [CompanyRole.OWNER]: 2,
      [CompanyRole.WORKER]: 1,
    };

  return roleHierarchy[membership.role as CompanyRole] >= roleHierarchy[requiredRole];
}

async function sendConfirmationEmail(reservation: any) {
  const icsContent = generateICS({
    title: `Reservation at ${reservation.company.name}`,
    description: `Reservation for ${reservation.customerName}`,
    location: reservation.company.address,
    startDate: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    timezone: reservation.company.settings?.timezone || 'Europe/Warsaw',
  });

  await sendEmail({
    to: reservation.customerEmail,
    subject: `Reservation Confirmation - ${reservation.company.name}`,
    html: `
      <h2>Reservation Confirmed</h2>
      <p>Dear ${reservation.customerName},</p>
      <p>Your reservation has been confirmed:</p>
      <ul>
        <li><strong>Company:</strong> ${reservation.company.name}</li>
        <li><strong>Date:</strong> ${reservation.date}</li>
        <li><strong>Time:</strong> ${reservation.startTime} - ${reservation.endTime}</li>
        <li><strong>Location:</strong> ${reservation.company.address}</li>
      </ul>
      ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ''}
      <p>Please arrive on time. If you need to cancel or reschedule, please contact us as soon as possible.</p>
    `,
    attachments: [
      {
        filename: 'reservation.ics',
        content: icsContent,
        contentType: 'text/calendar',
      },
    ],
  });
}

async function sendCancellationEmail(reservation: any) {
  await sendEmail({
    to: reservation.customerEmail,
    subject: `Reservation Cancelled - ${reservation.company.name}`,
    html: `
      <h2>Reservation Cancelled</h2>
      <p>Dear ${reservation.customerName},</p>
      <p>Your reservation has been cancelled:</p>
      <ul>
        <li><strong>Company:</strong> ${reservation.company.name}</li>
        <li><strong>Date:</strong> ${reservation.date}</li>
        <li><strong>Time:</strong> ${reservation.startTime} - ${reservation.endTime}</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
    `,
  });
}

export default router;
