import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { DateTime } from 'luxon';

// Walidacja enumów
export const ReservationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW'
} as const;

export const QueueStatus = {
  WAITING: 'WAITING',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export const AvailabilitySource = {
  WORKING_HOURS: 'WORKING_HOURS',
  SHIFT: 'SHIFT'
} as const;

export type ReservationStatusType = typeof ReservationStatus[keyof typeof ReservationStatus];
export type QueueStatusType = typeof QueueStatus[keyof typeof QueueStatus];
export type AvailabilitySourceType = typeof AvailabilitySource[keyof typeof AvailabilitySource];

// Schematy walidacji
export const createReservationSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  slotStart: z.string().datetime('Invalid datetime format'),
  slotEnd: z.string().datetime('Invalid datetime format'),
  workerId: z.string().min(1, 'Worker ID is required').optional(),
  notes: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  customerEmail: z.string().email('Invalid email format'),
});

export const updateReservationSchema = z.object({
  slotStart: z.string().datetime('Invalid datetime format').optional(),
  slotEnd: z.string().datetime('Invalid datetime format').optional(),
  workerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  customerName: z.string().min(1, 'Customer name is required').optional(),
  customerPhone: z.string().min(1, 'Customer phone is required').optional(),
  customerEmail: z.string().email('Invalid email format').optional(),
});

export const queueEntrySchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  reservationId: z.string().min(1, 'Reservation ID is required').optional(),
  estimatedStart: z.string().datetime('Invalid datetime format'),
  estimatedEnd: z.string().datetime('Invalid datetime format'),
  actualStart: z.string().datetime('Invalid datetime format').optional(),
  actualEnd: z.string().datetime('Invalid datetime format').optional(),
  queuePosition: z.number().min(1, 'Queue position must be at least 1'),
  status: z.enum(['WAITING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('WAITING'),
});

export type CreateReservationData = z.infer<typeof createReservationSchema>;
export type UpdateReservationData = z.infer<typeof updateReservationSchema>;
export type QueueEntryData = z.infer<typeof queueEntrySchema>;

export class ReservationService {
  /**
   * Tworzy nową rezerwację
   */
  static async createReservation(data: CreateReservationData) {
    try {
      // Walidacja danych
      const validatedData = createReservationSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
        include: { settings: true },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Sprawdź czy użytkownik istnieje
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Sprawdź czy pracownik istnieje (jeśli podano)
      if (validatedData.workerId) {
        const worker = await prisma.companyMembership.findUnique({
          where: {
            userId_companyId: {
              userId: validatedData.workerId,
              companyId: validatedData.companyId,
            },
          },
        });

        if (!worker || !worker.canServe) {
          throw new Error('Worker not found or cannot serve customers');
        }
      }

      // Sprawdź dostępność slotu
      const slotStart = DateTime.fromISO(validatedData.slotStart);
      const slotEnd = DateTime.fromISO(validatedData.slotEnd);

      if (slotStart >= slotEnd) {
        throw new Error('Slot start time must be before end time');
      }

      // Sprawdź czy slot nie koliduje z innymi rezerwacjami
      const conflictingReservation = await prisma.reservation.findFirst({
        where: {
          companyId: validatedData.companyId,
          workerId: validatedData.workerId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [
            {
              slotStart: { lt: validatedData.slotEnd },
              slotEnd: { gt: validatedData.slotStart },
            },
          ],
        },
      });

      if (conflictingReservation) {
        throw new Error('Time slot is not available');
      }

      // Utwórz rezerwację
      const reservation = await prisma.reservation.create({
        data: {
          ...validatedData,
          status: company.settings?.autoAcceptReservations ? 'CONFIRMED' : 'PENDING',
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return reservation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Pobiera rezerwację po ID
   */
  static async getReservationById(id: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          queueEntry: true,
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      return reservation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera rezerwacje użytkownika
   */
  static async getUserReservations(userId: string, options: {
    page?: number;
    limit?: number;
    status?: ReservationStatusType;
    companyId?: string;
    fromDate?: string;
    toDate?: string;
  } = {}) {
    try {
      const { page = 1, limit = 10, status, companyId, fromDate, toDate } = options;
      const skip = (page - 1) * limit;

      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (fromDate) {
        where.slotStart = { gte: fromDate };
      }

      if (toDate) {
        where.slotEnd = { lte: toDate };
      }

      if (fromDate && toDate) {
        where.slotStart = { gte: fromDate };
        where.slotEnd = { lte: toDate };
      }

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
                slug: true,
                timezone: true,
              },
            },
            worker: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: { slotStart: 'desc' },
        }),
        prisma.reservation.count({ where }),
      ]);

      return {
        reservations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera rezerwacje firmy
   */
  static async getCompanyReservations(companyId: string, options: {
    page?: number;
    limit?: number;
    status?: ReservationStatusType;
    workerId?: string;
    fromDate?: string;
    toDate?: string;
  } = {}) {
    try {
      const { page = 1, limit = 10, status, workerId, fromDate, toDate } = options;
      const skip = (page - 1) * limit;

      const where: any = { companyId };

      if (status) {
        where.status = status;
      }

      if (workerId) {
        where.workerId = workerId;
      }

      if (fromDate) {
        where.slotStart = { gte: fromDate };
      }

      if (toDate) {
        where.slotEnd = { lte: toDate };
      }

      if (fromDate && toDate) {
        where.slotStart = { gte: fromDate };
        where.slotEnd = { lte: toDate };
      }

      const [reservations, total] = await Promise.all([
        prisma.reservation.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
            worker: {
              select: {
                id: true,
                displayName: true,
              },
            },
            queueEntry: true,
          },
          orderBy: { slotStart: 'desc' },
        }),
        prisma.reservation.count({ where }),
      ]);

      return {
        reservations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje rezerwację
   */
  static async updateReservation(id: string, data: UpdateReservationData) {
    try {
      // Walidacja danych
      const validatedData = updateReservationSchema.parse(data);

      // Sprawdź czy rezerwacja istnieje
      const existingReservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!existingReservation) {
        throw new Error('Reservation not found');
      }

      // Sprawdź czy można edytować rezerwację
      if (existingReservation.status === 'COMPLETED' || existingReservation.status === 'CANCELLED') {
        throw new Error('Cannot update completed or cancelled reservation');
      }

      // Jeśli zmieniane są daty, sprawdź dostępność
      if (validatedData.slotStart || validatedData.slotEnd) {
        const newSlotStart = validatedData.slotStart || existingReservation.slotStart.toISOString();
        const newSlotEnd = validatedData.slotEnd || existingReservation.slotEnd.toISOString();
        const workerId = validatedData.workerId || existingReservation.workerId;

        const conflictingReservation = await prisma.reservation.findFirst({
          where: {
            id: { not: id },
            companyId: existingReservation.companyId,
            workerId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            OR: [
              {
                slotStart: { lt: newSlotEnd },
                slotEnd: { gt: newSlotStart },
              },
            ],
          },
        });

        if (conflictingReservation) {
          throw new Error('Time slot is not available');
        }
      }

      // Aktualizuj rezerwację
      const updatedReservation = await prisma.reservation.update({
        where: { id },
        data: validatedData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return updatedReservation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Anuluje rezerwację
   */
  static async cancelReservation(id: string, reason?: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status === 'CANCELLED' || reservation.status === 'COMPLETED') {
        throw new Error('Reservation is already cancelled or completed');
      }

      const updatedReservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${reservation.notes || ''}\nCancellation reason: ${reason}`.trim() : reservation.notes,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return updatedReservation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Potwierdza rezerwację
   */
  static async confirmReservation(id: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'PENDING') {
        throw new Error('Only pending reservations can be confirmed');
      }

      const updatedReservation = await prisma.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return updatedReservation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Oznacza rezerwację jako ukończoną
   */
  static async completeReservation(id: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'CONFIRMED') {
        throw new Error('Only confirmed reservations can be completed');
      }

      const updatedReservation = await prisma.reservation.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      return updatedReservation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      await prisma.reservation.delete({
        where: { id },
      });

      return { message: 'Reservation deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera dostępne sloty dla firmy
   */
  static async getAvailableSlots(companyId: string, date: string, workerId?: string) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          settings: true,
          workingHours: true,
          workBreaks: true,
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      const targetDate = DateTime.fromISO(date);
      const weekday = targetDate.weekday === 7 ? 0 : targetDate.weekday; // Convert Sunday from 7 to 0

      // Znajdź godziny pracy dla danego dnia
      const workingHours = company.workingHours.find(wh => wh.weekday === weekday);
      if (!workingHours) {
        return { slots: [] };
      }

      // Pobierz istniejące rezerwacje
      const existingReservations = await prisma.reservation.findMany({
        where: {
          companyId,
          workerId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          slotStart: {
            gte: targetDate.startOf('day').toISO(),
            lt: targetDate.endOf('day').toISO(),
          },
        },
      });

      // Generuj dostępne sloty
      const slotDuration = company.settings?.slotMinutes || 30;
      const slots = [];

      const openTime = DateTime.fromISO(`${date}T${workingHours.openTime}`);
      const closeTime = DateTime.fromISO(`${date}T${workingHours.closeTime}`);

      let currentSlot = openTime;
      while (currentSlot.plus({ minutes: slotDuration }) <= closeTime) {
        const slotEnd = currentSlot.plus({ minutes: slotDuration });

        // Sprawdź czy slot nie koliduje z rezerwacją
        const isBooked = existingReservations.some(reservation => {
          const reservationStart = DateTime.fromJSDate(reservation.slotStart);
          const reservationEnd = DateTime.fromJSDate(reservation.slotEnd);
          return currentSlot < reservationEnd && slotEnd > reservationStart;
        });

        // Sprawdź czy slot nie koliduje z przerwą
        const isInBreak = company.workBreaks.some(workBreak => {
          if (workBreak.weekday !== weekday) return false;
          const breakStart = DateTime.fromISO(`${date}T${workBreak.startTime}`);
          const breakEnd = DateTime.fromISO(`${date}T${workBreak.endTime}`);
          return currentSlot < breakEnd && slotEnd > breakStart;
        });

        if (!isBooked && !isInBreak) {
          slots.push({
            start: currentSlot.toISO(),
            end: slotEnd.toISO(),
            available: true,
          });
        }

        currentSlot = currentSlot.plus({ minutes: slotDuration });
      }

      return { slots };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tworzy wpis w kolejce
   */
  static async createQueueEntry(data: QueueEntryData) {
    try {
      // Walidacja danych
      const validatedData = queueEntrySchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Utwórz wpis w kolejce
      const queueEntry = await prisma.queueEntry.create({
        data: validatedData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          reservation: {
            select: {
              id: true,
              slotStart: true,
              slotEnd: true,
            },
          },
        },
      });

      return queueEntry;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Pobiera kolejkę firmy
   */
  static async getCompanyQueue(companyId: string, date?: string) {
    try {
      const where: any = { companyId };

      if (date) {
        const targetDate = DateTime.fromISO(date);
        where.estimatedStart = {
          gte: targetDate.startOf('day').toISO(),
          lt: targetDate.endOf('day').toISO(),
        };
      }

      const queueEntries = await prisma.queueEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          reservation: {
            select: {
              id: true,
              slotStart: true,
              slotEnd: true,
              customerName: true,
              customerPhone: true,
            },
          },
        },
        orderBy: { queuePosition: 'asc' },
      });

      return queueEntries;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje status wpisu w kolejce
   */
  static async updateQueueEntryStatus(id: string, status: QueueStatusType, actualStart?: string, actualEnd?: string) {
    try {
      const queueEntry = await prisma.queueEntry.findUnique({
        where: { id },
      });

      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      const updateData: any = { status };

      if (actualStart) {
        updateData.actualStart = actualStart;
      }

      if (actualEnd) {
        updateData.actualEnd = actualEnd;
      }

      const updatedEntry = await prisma.queueEntry.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          reservation: {
            select: {
              id: true,
              slotStart: true,
              slotEnd: true,
            },
          },
        },
      });

      return updatedEntry;
    } catch (error) {
      throw error;
    }
  }
}
