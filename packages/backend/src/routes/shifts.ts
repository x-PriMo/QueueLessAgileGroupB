import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireCompanyMember, AuthenticatedRequest } from '../middleware/auth';
import { ShiftService } from '../services/shiftService';

const router = Router();

// Schematy walidacji
const createShiftSchema = z.object({
  workerId: z.string().uuid(),
  companyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  availabilitySource: z.enum(['MANUAL', 'WORKING_HOURS']).default('MANUAL'),
});

const updateShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availabilitySource: z.enum(['MANUAL', 'WORKING_HOURS']).optional(),
  isActive: z.boolean().optional(),
});

const bulkCreateShiftsSchema = z.object({
  shifts: z.array(createShiftSchema).min(1).max(100),
});

const copyWeeklyShiftsSchema = z.object({
  companyId: z.string().uuid(),
  sourceWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workerIds: z.array(z.string().uuid()).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

/**
 * POST /api/shifts
 * Tworzenie nowej zmiany
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = createShiftSchema.parse(req.body);

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, validatedData.companyId, ['OWNER', 'MANAGER']);

    const shift = await ShiftService.createShift(validatedData);
    res.status(201).json(shift);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (error.message === 'Worker not found') {
        return res.status(404).json({
          error: 'Worker not found',
        });
      }
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: 'Company not found',
        });
      }
      if (error.message === 'Worker is not a member of this company') {
        return res.status(400).json({
          error: 'Worker is not a member of this company',
        });
      }
      if (error.message === 'Invalid time range') {
        return res.status(400).json({
          error: 'Invalid time range - end time must be after start time',
        });
      }
      if (error.message === 'Shift already exists for this worker on this date') {
        return res.status(409).json({
          error: 'Shift already exists for this worker on this date',
        });
      }
    }

    console.error('Create shift error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/shifts/bulk
 * Tworzenie wielu zmian jednocześnie
 */
router.post('/bulk', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = bulkCreateShiftsSchema.parse(req.body);

    // Sprawdź uprawnienia do wszystkich firm
    const companyIds = [...new Set(validatedData.shifts.map(s => s.companyId))];
    for (const companyId of companyIds) {
      await requireCompanyMember(req, res, companyId, ['OWNER', 'MANAGER']);
    }

    const result = await ShiftService.bulkCreateShifts(validatedData.shifts);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Bulk create shifts error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/shifts/copy-weekly
 * Kopiowanie zmian z jednego tygodnia do drugiego
 */
router.post('/copy-weekly', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = copyWeeklyShiftsSchema.parse(req.body);

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, validatedData.companyId, ['OWNER', 'MANAGER']);

    const result = await ShiftService.copyWeeklyShifts(
      validatedData.companyId,
      validatedData.sourceWeekStart,
      validatedData.targetWeekStart,
      validatedData.workerIds
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: 'Company not found',
        });
      }
      if (error.message === 'No shifts found for the source week') {
        return res.status(404).json({
          error: 'No shifts found for the source week',
        });
      }
    }

    console.error('Copy weekly shifts error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/shifts
 * Pobieranie zmian z filtrowaniem
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const query = z.object({
      ...paginationSchema.shape,
      companyId: z.string().uuid().optional(),
      workerId: z.string().uuid().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      isActive: z.coerce.boolean().optional(),
    }).parse(req.query);

    // Jeśli podano companyId, sprawdź uprawnienia
    if (query.companyId) {
      await requireCompanyMember(req, res, query.companyId, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    }

    const result = await ShiftService.getShifts({
      page: query.page,
      limit: query.limit,
      companyId: query.companyId,
      workerId: query.workerId,
      date: query.date,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isActive: query.isActive,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Get shifts error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/shifts/:id
 * Pobieranie szczegółów zmiany
 */
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const shift = await ShiftService.getShiftById(id);

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, shift.companyId, ['OWNER', 'MANAGER', 'EMPLOYEE']);

    res.json(shift);
  } catch (error) {
    if (error instanceof Error && error.message === 'Shift not found') {
      return res.status(404).json({
        error: 'Shift not found',
      });
    }

    console.error('Get shift error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /api/shifts/:id
 * Aktualizacja zmiany
 */
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateShiftSchema.parse(req.body);

    // Pobierz zmianę aby sprawdzić uprawnienia
    const existingShift = await ShiftService.getShiftById(id);
    await requireCompanyMember(req, res, existingShift.companyId, ['OWNER', 'MANAGER']);

    const updatedShift = await ShiftService.updateShift(id, validatedData);
    res.json(updatedShift);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (error.message === 'Shift not found') {
        return res.status(404).json({
          error: 'Shift not found',
        });
      }
      if (error.message === 'Invalid time range') {
        return res.status(400).json({
          error: 'Invalid time range - end time must be after start time',
        });
      }
    }

    console.error('Update shift error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/shifts/:id
 * Usuwanie zmiany (soft delete)
 */
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Pobierz zmianę aby sprawdzić uprawnienia
    const existingShift = await ShiftService.getShiftById(id);
    await requireCompanyMember(req, res, existingShift.companyId, ['OWNER', 'MANAGER']);

    await ShiftService.deactivateShift(id);
    res.json({
      message: 'Shift deactivated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Shift not found') {
      return res.status(404).json({
        error: 'Shift not found',
      });
    }

    console.error('Delete shift error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/shifts/company/:companyId/workers/:workerId
 * Pobieranie zmian konkretnego pracownika w firmie
 */
router.get('/company/:companyId/workers/:workerId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId, workerId } = req.params;
    const query = z.object({
      ...paginationSchema.shape,
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      isActive: z.coerce.boolean().optional(),
    }).parse(req.query);

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, companyId, ['OWNER', 'MANAGER', 'EMPLOYEE']);

    const result = await ShiftService.getShiftsByWorker(workerId, {
      page: query.page,
      limit: query.limit,
      companyId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isActive: query.isActive,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Get worker shifts error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/shifts/company/:companyId/date/:date
 * Pobieranie wszystkich zmian w firmie na konkretny dzień
 */
router.get('/company/:companyId/date/:date', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId, date } = req.params;

    // Walidacja daty
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, companyId, ['OWNER', 'MANAGER', 'EMPLOYEE']);

    const shifts = await ShiftService.getShiftsByDate(companyId, date);
    res.json(shifts);
  } catch (error) {
    console.error('Get shifts by date error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/shifts/company/:companyId/available-workers
 * Pobieranie dostępnych pracowników na podstawie zmian i rezerwacji
 */
router.get('/company/:companyId/available-workers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.params;
    const query = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      excludeReservationId: z.string().uuid().optional(),
    }).parse(req.query);

    // Sprawdź uprawnienia do firmy
    await requireCompanyMember(req, res, companyId, ['OWNER', 'MANAGER', 'EMPLOYEE']);

    const availableWorkers = await ShiftService.findAvailableWorkers(
      companyId,
      query.date,
      query.startTime,
      query.endTime,
      query.excludeReservationId
    );

    res.json(availableWorkers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Get available workers error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
