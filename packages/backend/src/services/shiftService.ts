import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { DateTime } from 'luxon';

// Walidacja enumów
export const AvailabilitySource = {
  WORKING_HOURS: 'WORKING_HOURS',
  SHIFT: 'SHIFT'
} as const;

export type AvailabilitySourceType = typeof AvailabilitySource[keyof typeof AvailabilitySource];

// Schematy walidacji
export const createShiftSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  workerId: z.string().min(1, 'Worker ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  availabilitySource: z.enum(['WORKING_HOURS', 'SHIFT']).default('SHIFT'),
  notes: z.string().optional(),
});

export const updateShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  availabilitySource: z.enum(['WORKING_HOURS', 'SHIFT']).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const bulkCreateShiftsSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  workerId: z.string().min(1, 'Worker ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  weekdays: z.array(z.number().min(0).max(6)).min(1, 'At least one weekday must be selected'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  availabilitySource: z.enum(['WORKING_HOURS', 'SHIFT']).default('SHIFT'),
  notes: z.string().optional(),
});

export type CreateShiftData = z.infer<typeof createShiftSchema>;
export type UpdateShiftData = z.infer<typeof updateShiftSchema>;
export type BulkCreateShiftsData = z.infer<typeof bulkCreateShiftsSchema>;

export class ShiftService {
  /**
   * Tworzy nową zmianę
   */
  static async createShift(data: CreateShiftData) {
    try {
      // Walidacja danych
      const validatedData = createShiftSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Sprawdź czy pracownik jest członkiem firmy
      const membership = await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: validatedData.workerId,
            companyId: validatedData.companyId,
          },
        },
      });

      if (!membership || !membership.canServe) {
        throw new Error('Worker not found or cannot serve customers');
      }

      // Sprawdź czy zmiana już istnieje dla tego dnia
      const existingShift = await prisma.shift.findUnique({
        where: {
          companyId_workerId_date: {
            companyId: validatedData.companyId,
            workerId: validatedData.workerId,
            date: validatedData.date,
          },
        },
      });

      if (existingShift) {
        throw new Error('Shift already exists for this date');
      }

      // Walidacja czasu
      const startTime = DateTime.fromISO(`${validatedData.date}T${validatedData.startTime}`);
      const endTime = DateTime.fromISO(`${validatedData.date}T${validatedData.endTime}`);

      if (startTime >= endTime) {
        throw new Error('Start time must be before end time');
      }

      // Utwórz zmianę
      const shift = await prisma.shift.create({
        data: validatedData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
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

      return shift;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Pobiera zmianę po ID
   */
  static async getShiftById(id: string) {
    try {
      const shift = await prisma.shift.findUnique({
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
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      return shift;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera zmiany pracownika
   */
  static async getWorkerShifts(workerId: string, options: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const { companyId, fromDate, toDate, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const where: any = { workerId, isActive: true };

      if (companyId) {
        where.companyId = companyId;
      }

      if (fromDate) {
        where.date = { gte: fromDate };
      }

      if (toDate) {
        where.date = { ...where.date, lte: toDate };
      }

      const [shifts, total] = await Promise.all([
        prisma.shift.findMany({
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
          },
          orderBy: { date: 'desc' },
        }),
        prisma.shift.count({ where }),
      ]);

      return {
        shifts,
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
   * Pobiera zmiany firmy
   */
  static async getCompanyShifts(companyId: string, options: {
    workerId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const { workerId, fromDate, toDate, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const where: any = { companyId, isActive: true };

      if (workerId) {
        where.workerId = workerId;
      }

      if (fromDate) {
        where.date = { gte: fromDate };
      }

      if (toDate) {
        where.date = { ...where.date, lte: toDate };
      }

      const [shifts, total] = await Promise.all([
        prisma.shift.findMany({
          where,
          skip,
          take: limit,
          include: {
            worker: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
          orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        }),
        prisma.shift.count({ where }),
      ]);

      return {
        shifts,
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
   * Pobiera zmiany dla konkretnego dnia
   */
  static async getShiftsByDate(companyId: string, date: string) {
    try {
      const shifts = await prisma.shift.findMany({
        where: {
          companyId,
          date,
          isActive: true,
        },
        include: {
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      return shifts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje zmianę
   */
  static async updateShift(id: string, data: UpdateShiftData) {
    try {
      // Walidacja danych
      const validatedData = updateShiftSchema.parse(data);

      // Sprawdź czy zmiana istnieje
      const existingShift = await prisma.shift.findUnique({
        where: { id },
      });

      if (!existingShift) {
        throw new Error('Shift not found');
      }

      // Walidacja czasu (jeśli zmieniane)
      if (validatedData.startTime || validatedData.endTime) {
        const date = validatedData.date || existingShift.date;
        const startTime = validatedData.startTime || existingShift.startTime;
        const endTime = validatedData.endTime || existingShift.endTime;

        const start = DateTime.fromISO(`${date}T${startTime}`);
        const end = DateTime.fromISO(`${date}T${endTime}`);

        if (start >= end) {
          throw new Error('Start time must be before end time');
        }
      }

      // Sprawdź czy nowa data nie koliduje z inną zmianą (jeśli zmieniana data)
      if (validatedData.date && validatedData.date !== existingShift.date) {
        const conflictingShift = await prisma.shift.findUnique({
          where: {
            companyId_userId_date: {
              companyId: existingShift.companyId,
              userId: existingShift.userId,
              date: validatedData.date,
            },
          },
        });

        if (conflictingShift) {
          throw new Error('Shift already exists for this date');
        }
      }

      // Aktualizuj zmianę
      const updatedShift = await prisma.shift.update({
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
          worker: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return updatedShift;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Usuwa zmianę
   */
  static async deleteShift(id: string) {
    try {
      const shift = await prisma.shift.findUnique({
        where: { id },
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Sprawdź czy są rezerwacje powiązane z tą zmianą
      const reservations = await prisma.reservation.findMany({
        where: {
          companyId: shift.companyId,
          workerId: shift.workerId,
          slotStart: {
            gte: DateTime.fromISO(`${shift.date}T${shift.startTime}`).toJSDate(),
            lt: DateTime.fromISO(`${shift.date}T${shift.endTime}`).toJSDate(),
          },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (reservations.length > 0) {
        throw new Error('Cannot delete shift with existing reservations');
      }

      await prisma.shift.delete({
        where: { id },
      });

      return { message: 'Shift deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dezaktywuje zmianę (soft delete)
   */
  static async deactivateShift(id: string) {
    try {
      const shift = await prisma.shift.findUnique({
        where: { id },
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      const updatedShift = await prisma.shift.update({
        where: { id },
        data: { isActive: false },
      });

      return updatedShift;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tworzy wiele zmian na raz
   */
  static async bulkCreateShifts(data: BulkCreateShiftsData) {
    try {
      // Walidacja danych
      const validatedData = bulkCreateShiftsSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Sprawdź czy pracownik jest członkiem firmy
      const membership = await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: validatedData.workerId,
            companyId: validatedData.companyId,
          },
        },
      });

      if (!membership || !membership.canServe) {
        throw new Error('Worker not found or cannot serve customers');
      }

      // Walidacja dat
      const startDate = DateTime.fromISO(validatedData.startDate);
      const endDate = DateTime.fromISO(validatedData.endDate);

      if (startDate >= endDate) {
        throw new Error('Start date must be before end date');
      }

      // Walidacja czasu
      const startTime = DateTime.fromISO(`${validatedData.startDate}T${validatedData.startTime}`);
      const endTime = DateTime.fromISO(`${validatedData.startDate}T${validatedData.endTime}`);

      if (startTime >= endTime) {
        throw new Error('Start time must be before end time');
      }

      // Generuj daty dla wybranych dni tygodnia
      const shiftsToCreate = [];
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const weekday = currentDate.weekday === 7 ? 0 : currentDate.weekday; // Convert Sunday from 7 to 0

        if (validatedData.weekdays.includes(weekday)) {
          shiftsToCreate.push({
            companyId: validatedData.companyId,
            workerId: validatedData.workerId,
            date: currentDate.toISODate(),
            startTime: validatedData.startTime,
            endTime: validatedData.endTime,
            availabilitySource: validatedData.availabilitySource,
            notes: validatedData.notes,
          });
        }

        currentDate = currentDate.plus({ days: 1 });
      }

      if (shiftsToCreate.length === 0) {
        throw new Error('No shifts to create for selected weekdays');
      }

      // Sprawdź czy nie ma konfliktów z istniejącymi zmianami
      const existingShifts = await prisma.shift.findMany({
        where: {
          companyId: validatedData.companyId,
          workerId: validatedData.workerId,
          date: {
            in: shiftsToCreate.map(shift => shift.date),
          },
        },
      });

      if (existingShifts.length > 0) {
        const conflictDates = existingShifts.map(shift => shift.date).join(', ');
        throw new Error(`Shifts already exist for dates: ${conflictDates}`);
      }

      // Utwórz zmiany w transakcji
      const createdShifts = await prisma.$transaction(
        shiftsToCreate.map(shiftData =>
          prisma.shift.create({
            data: shiftData,
          })
        )
      );

      return {
        message: `Successfully created ${createdShifts.length} shifts`,
        shifts: createdShifts,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Kopiuje zmiany z jednego tygodnia do drugiego
   */
  static async copyWeekShifts(companyId: string, sourceWeekStart: string, targetWeekStart: string, workerId?: string) {
    try {
      const sourceStart = DateTime.fromISO(sourceWeekStart).startOf('week');
      const sourceEnd = sourceStart.endOf('week');
      const targetStart = DateTime.fromISO(targetWeekStart).startOf('week');

      // Pobierz zmiany z tygodnia źródłowego
      const where: any = {
        companyId,
        date: {
          gte: sourceStart.toISODate(),
          lte: sourceEnd.toISODate(),
        },
        isActive: true,
      };

      if (workerId) {
        where.workerId = workerId;
      }

      const sourceShifts = await prisma.shift.findMany({
        where,
      });

      if (sourceShifts.length === 0) {
        throw new Error('No shifts found in source week');
      }

      // Przygotuj zmiany do skopiowania
      const shiftsToCreate = sourceShifts.map(shift => {
        const sourceDate = DateTime.fromISO(shift.date);
        const daysDiff = sourceDate.diff(sourceStart, 'days').days;
        const targetDate = targetStart.plus({ days: daysDiff });

        return {
          companyId: shift.companyId,
          workerId: shift.workerId,
          date: targetDate.toISODate(),
          startTime: shift.startTime,
          endTime: shift.endTime,
          availabilitySource: shift.availabilitySource,
          notes: shift.notes,
        };
      });

      // Sprawdź czy nie ma konfliktów
      const existingShifts = await prisma.shift.findMany({
        where: {
          companyId,
          date: {
            in: shiftsToCreate.map(shift => shift.date),
          },
          workerId: workerId ? workerId : { in: shiftsToCreate.map(shift => shift.workerId) },
        },
      });

      if (existingShifts.length > 0) {
        const conflictDates = existingShifts.map(shift => shift.date).join(', ');
        throw new Error(`Shifts already exist for dates: ${conflictDates}`);
      }

      // Utwórz skopiowane zmiany
      const createdShifts = await prisma.$transaction(
        shiftsToCreate.map(shiftData =>
          prisma.shift.create({
            data: shiftData,
          })
        )
      );

      return {
        message: `Successfully copied ${createdShifts.length} shifts`,
        shifts: createdShifts,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera dostępnych pracowników dla danej daty i czasu
   */
  static async getAvailableWorkers(companyId: string, date: string, startTime: string, endTime: string) {
    try {
      // Pobierz wszystkich pracowników firmy
      const companyMembers = await prisma.companyMembership.findMany({
        where: {
          companyId,
          canServe: true,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      // Pobierz zmiany dla danej daty
      const shifts = await prisma.shift.findMany({
        where: {
          companyId,
          date,
          isActive: true,
        },
      });

      // Pobierz rezerwacje dla danej daty i czasu
      const reservations = await prisma.reservation.findMany({
        where: {
          companyId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          slotStart: { lt: DateTime.fromISO(`${date}T${endTime}`).toJSDate() },
          slotEnd: { gt: DateTime.fromISO(`${date}T${startTime}`).toJSDate() },
        },
      });

      // Filtruj dostępnych pracowników
      const availableWorkers = companyMembers.filter(member => {
        // Sprawdź czy pracownik ma zmianę w tym dniu
        const workerShift = shifts.find(shift => shift.userId === member.userId);
        if (!workerShift) {
          return false; // Brak zmiany = niedostępny
        }

        // Sprawdź czy zmiana pokrywa żądany czas
        const shiftStart = DateTime.fromISO(`${date}T${workerShift.startTime}`);
        const shiftEnd = DateTime.fromISO(`${date}T${workerShift.endTime}`);
        const requestStart = DateTime.fromISO(`${date}T${startTime}`);
        const requestEnd = DateTime.fromISO(`${date}T${endTime}`);

        if (requestStart < shiftStart || requestEnd > shiftEnd) {
          return false; // Żądany czas wykracza poza zmianę
        }

        // Sprawdź czy pracownik nie ma rezerwacji w tym czasie
        const hasConflictingReservation = reservations.some(reservation => 
          reservation.workerId === member.userId
        );

        return !hasConflictingReservation;
      });

      return availableWorkers.map(member => ({
        id: member.userId,
        email: member.user.email,
        displayName: member.user.displayName,
        role: member.role,
        isTrainee: member.isTrainee,
      }));
    } catch (error) {
      throw error;
    }
  }
}