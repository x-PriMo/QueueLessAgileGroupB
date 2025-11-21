import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import db from '../lib/db';
import { authGuard, memberGuard, roleGuard } from '../middleware/auth';

const router = Router();

// Schemat walidacji dla godzin pracy
const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0=niedziela, 1=poniedziałek, ..., 6=sobota
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  isActive: z.boolean().default(true),
});

const updateWorkingHoursSchema = workingHoursSchema.partial();

// GET /working-hours/company/:companyId - Pobierz godziny pracy firmy (publiczne)
router.get('/company/:companyId', (req: Request, res: Response) => {
  const companyId = Number(req.params.companyId);
  
  if (isNaN(companyId)) {
    return res.status(400).json({ error: 'Invalid company ID' });
  }

  try {
    const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId) as { id: number } | undefined;
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const workingHours = db.prepare(`
      SELECT id, companyId, dayOfWeek, startTime, endTime, isActive, created_at, updated_at
      FROM working_hours 
      WHERE companyId = ? AND isActive = 1
      ORDER BY dayOfWeek, startTime
    `).all(companyId) as {
      id: number;
      companyId: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive: number;
      created_at: string;
      updated_at: string;
    }[];

    res.json({ workingHours });
  } catch (error) {
    console.error('Error fetching working hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /working-hours/company/:companyId - Utwórz godziny pracy (tylko OWNER)
router.post('/company/:companyId', 
  authGuard, 
  memberGuard('companyId'), 
  roleGuard('OWNER'), 
  (req: Request, res: Response) => {
    try {
      const companyId = Number(req.params.companyId);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }

      const validationResult = workingHoursSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation errors',
          details: validationResult.error.errors.map(err => ({
            field: err.path[0],
            message: err.message
          }))
        });
      }

      console.log('POST /working-hours/company', { companyId, body: req.body });
      const { dayOfWeek, startTime, endTime, isActive } = validationResult.data;

      // Walidacja logiczna - endTime musi być po startTime
      if (startTime >= endTime) {
        return res.status(400).json({
          error: 'End time must be after start time'
        });
      }

      // Sprawdź czy już istnieją godziny dla tego dnia
      const existing = db.prepare(`
        SELECT id FROM working_hours 
        WHERE companyId = ? AND dayOfWeek = ?
      `).get(companyId, dayOfWeek) as { id: number } | undefined;

      console.log('Existing check', existing);
      if (existing) {
        return res.status(409).json({
          error: 'Working hours for this day already exist'
        });
      }

      console.log('Inserting working hours');
      const result = db.prepare(`
        INSERT INTO working_hours (companyId, dayOfWeek, startTime, endTime, isActive)
        VALUES (?, ?, ?, ?, ?)
      `).run(companyId, dayOfWeek, startTime, endTime, isActive ? 1 : 0);

      console.log('Inserted id', result.lastInsertRowid);
      const newWorkingHours = db.prepare(`
        SELECT id, dayOfWeek, startTime, endTime, isActive, created_at, updated_at
        FROM working_hours 
        WHERE id = ?
      `).get(Number(result.lastInsertRowid)) as {
        id: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isActive: number;
        created_at: string;
        updated_at: string;
      } | undefined;

      res.status(201).json({ workingHours: newWorkingHours });
    } catch (error) {
      console.error('Create working hours error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /working-hours/:id - Aktualizuj godziny pracy (tylko OWNER)
router.put('/:id', authGuard, (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid working hours ID' });
    }

    // Pobierz istniejące godziny pracy
    const existingWorkingHours = db.prepare(`
      SELECT companyId, dayOfWeek, startTime, endTime, isActive
      FROM working_hours 
      WHERE id = ?
    `).get(id) as {
      companyId: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive: number;
    } | undefined;

    if (!existingWorkingHours) {
      return res.status(404).json({ error: 'Working hours not found' });
    }

    // Sprawdź uprawnienia - użytkownik musi być OWNER tej firmy
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const member = db.prepare(`
      SELECT role FROM company_members 
      WHERE companyId = ? AND userId = ?
    `).get(existingWorkingHours.companyId, user.id) as { role: 'OWNER' | 'WORKER' } | undefined;

    if (!member || member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const validationResult = updateWorkingHoursSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation errors',
        details: validationResult.error.errors.map(err => ({
          field: err.path[0],
          message: err.message
        }))
      });
    }

    const updateData = validationResult.data;

    // Walidacja logiczna - jeśli podano oba czasy
    const startTime = updateData.startTime || existingWorkingHours.startTime;
    const endTime = updateData.endTime || existingWorkingHours.endTime;
    
    if (startTime >= endTime) {
      return res.status(400).json({
        error: 'End time must be after start time'
      });
    }

    // Sprawdź konflikt dayOfWeek jeśli się zmienia
    if (updateData.dayOfWeek !== undefined && updateData.dayOfWeek !== existingWorkingHours.dayOfWeek) {
      const conflict = db.prepare(`
        SELECT id FROM working_hours 
        WHERE companyId = ? AND dayOfWeek = ? AND id != ?
      `).get(existingWorkingHours.companyId, updateData.dayOfWeek, id);

      if (conflict) {
        return res.status(409).json({
          error: 'Working hours for this day already exist'
        });
      }
    }

    // Przygotuj zapytanie UPDATE
    const fieldsToUpdate: string[] = [];
    const values: Array<string | number> = [];

    if (updateData.dayOfWeek !== undefined) {
      fieldsToUpdate.push('dayOfWeek = ?');
      values.push(updateData.dayOfWeek);
    }
    if (updateData.startTime !== undefined) {
      fieldsToUpdate.push('startTime = ?');
      values.push(updateData.startTime);
    }
    if (updateData.endTime !== undefined) {
      fieldsToUpdate.push('endTime = ?');
      values.push(updateData.endTime);
    }
    if (updateData.isActive !== undefined) {
      fieldsToUpdate.push('isActive = ?');
      values.push(updateData.isActive ? 1 : 0);
    }

    fieldsToUpdate.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`
      UPDATE working_hours 
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = ?
    `).run(...values);

    const updatedWorkingHours = db.prepare(`
      SELECT id, dayOfWeek, startTime, endTime, isActive, created_at, updated_at
      FROM working_hours
      WHERE id = ?
    `).get(id) as {
      id: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive: number;
      created_at: string;
      updated_at: string;
    } | undefined;

    res.json({ workingHours: updatedWorkingHours });
  } catch (error) {
    console.error('Update working hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /working-hours/:id - Usuń godziny pracy (tylko OWNER)
router.delete('/:id', authGuard, (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid working hours ID' });
    }

    // Pobierz istniejące godziny pracy
    const existingWorkingHours = db.prepare(`
      SELECT companyId FROM working_hours WHERE id = ?
    `).get(id) as { companyId: number } | undefined;

    if (!existingWorkingHours) {
      return res.status(404).json({ error: 'Working hours not found' });
    }

    // Sprawdź uprawnienia - użytkownik musi być zalogowany i OWNER tej firmy
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const member = db.prepare(`
      SELECT role FROM company_members 
      WHERE companyId = ? AND userId = ?
    `).get(existingWorkingHours.companyId, user?.id) as { role: 'OWNER' | 'WORKER' } | undefined;

    if (!member || member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM working_hours WHERE id = ?').run(id);

    res.json({ message: 'Working hours deleted successfully' });
  } catch (error) {
    console.error('Delete working hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
