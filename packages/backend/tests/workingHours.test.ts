import request, { type SuperAgentTest } from 'supertest';
import app from '../src/index';
import db from '../src/lib/db';
import bcrypt from 'bcrypt';

describe('Working Hours API', () => {
  let companyId: number;
  let ownerId: number;
  let workerId: number;
  let ownerAgent: SuperAgentTest;
  let workerAgent: SuperAgentTest;
  let userAgent: SuperAgentTest;

  beforeEach(async () => {
    // Utwórz firmę testową
    const companyResult = db.prepare(`
      INSERT INTO companies (name, timezone) 
      VALUES ('Test Company', 'Europe/Warsaw')
    `).run();
    companyId = Number(companyResult.lastInsertRowid);

    // Utwórz użytkowników testowych
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const ownerResult = db.prepare(`
      INSERT INTO users (email, passwordHash, role) 
      VALUES ('owner@test.com', ?, 'OWNER')
    `).run(hashedPassword);
    ownerId = Number(ownerResult.lastInsertRowid);

    const workerResult = db.prepare(`
      INSERT INTO users (email, passwordHash, role) 
      VALUES ('worker@test.com', ?, 'WORKER')
    `).run(hashedPassword);
    workerId = Number(workerResult.lastInsertRowid);

    db.prepare(`
      INSERT INTO users (email, passwordHash, role) 
      VALUES ('user@test.com', ?, 'USER')
    `).run(hashedPassword);

    // Przypisz użytkowników do firmy
    db.prepare(`
      INSERT INTO company_members (companyId, userId, role) 
      VALUES (?, ?, 'OWNER')
    `).run(companyId, ownerId);

    db.prepare(`
      INSERT INTO company_members (companyId, userId, role) 
      VALUES (?, ?, 'WORKER')
    `).run(companyId, workerId);

    // Zaloguj użytkowników i pobierz cookies
    ownerAgent = request.agent(app);
    await ownerAgent
      .post('/auth/login')
      .send({ email: 'owner@test.com', password: 'password123' });

    workerAgent = request.agent(app);
    await workerAgent
      .post('/auth/login')
      .send({ email: 'worker@test.com', password: 'password123' });

    userAgent = request.agent(app);
    await userAgent
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
  });

  describe('GET /working-hours/company/:companyId', () => {
    it('should return empty working hours for new company', async () => {
      const response = await request(app)
        .get(`/working-hours/company/${companyId}`);

      expect(response.status).toBe(200);
      expect(response.body.workingHours).toEqual([]);
    });

    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/working-hours/company/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Company not found');
    });

    it('should return 400 for invalid company ID', async () => {
      const response = await request(app)
        .get('/working-hours/company/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid company ID');
    });
  });

  describe('POST /working-hours/company/:companyId', () => {
    it('should create working hours as OWNER', async () => {
      const workingHoursData = {
        dayOfWeek: 1, // Poniedziałek
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      };

      const response = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(201);
      expect(response.body.workingHours).toMatchObject({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isActive: 1
      });
    });

    it('should reject creation by WORKER', async () => {
      const workingHoursData = {
        dayOfWeek: 2, // Wtorek
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      };

      const response = await workerAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should reject creation by regular USER', async () => {
      const workingHoursData = {
        dayOfWeek: 2, // Wtorek
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      };

      const response = await userAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should reject unauthenticated requests', async () => {
      const workingHoursData = {
        dayOfWeek: 2, // Wtorek
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      };

      const response = await request(app)
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject invalid time format', async () => {
      const workingHoursData = {
        dayOfWeek: 2,
        startTime: '25:00', // Nieprawidłowa godzina
        endTime: '17:00',
        isActive: true
      };

      const response = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation errors');
    });

    it('should reject end time before start time', async () => {
      const workingHoursData = {
        dayOfWeek: 2,
        startTime: '17:00',
        endTime: '09:00', // Koniec przed początkiem
        isActive: true
      };

      const response = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('End time must be after start time');
    });

    it('should reject duplicate day of week', async () => {
      // Najpierw utwórz godziny pracy dla poniedziałku
      const firstResponse = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true });
      expect(firstResponse.status).toBe(201);

      // Druga próba dla tego samego dnia powinna zwrócić 409
      const duplicateResponse = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send({ dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isActive: true });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.error).toBe('Working hours for this day already exist');
    });

    it('should reject invalid day of week', async () => {
      const workingHoursData = {
        dayOfWeek: 7, // Nieprawidłowy dzień (0-6)
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      };

      const response = await ownerAgent
        .post(`/working-hours/company/${companyId}`)
        .send(workingHoursData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation errors');
    });
  });

  describe('PUT /working-hours/:id', () => {
    let workingHoursId: number;

    beforeEach(async () => {
      // Utwórz godziny pracy do testowania aktualizacji
      const result = db.prepare(`
        INSERT INTO working_hours (companyId, dayOfWeek, startTime, endTime, isActive)
        VALUES (?, 3, '08:00', '16:00', 1)
      `).run(companyId);
      workingHoursId = Number(result.lastInsertRowid);
    });

    it('should update working hours as OWNER', async () => {
      const updateData = {
        startTime: '09:00',
        endTime: '17:00'
      };

      const response = await ownerAgent
        .put(`/working-hours/${workingHoursId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.workingHours).toMatchObject({
        startTime: '09:00',
        endTime: '17:00',
        dayOfWeek: 3
      });
    });

    it('should reject update by WORKER', async () => {
      const updateData = {
        startTime: '10:00'
      };

      const response = await workerAgent
        .put(`/working-hours/${workingHoursId}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent working hours', async () => {
      const updateData = {
        startTime: '10:00'
      };

      const response = await ownerAgent
        .put('/working-hours/99999')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Working hours not found');
    });
  });

  describe('DELETE /working-hours/:id', () => {
    let workingHoursId: number;

    beforeEach(async () => {
      // Utwórz godziny pracy do testowania usuwania
      const result = db.prepare(`
        INSERT INTO working_hours (companyId, dayOfWeek, startTime, endTime, isActive)
        VALUES (?, 4, '08:00', '16:00', 1)
      `).run(companyId);
      workingHoursId = Number(result.lastInsertRowid);
    });

    it('should delete working hours as OWNER', async () => {
      const response = await ownerAgent
        .delete(`/working-hours/${workingHoursId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Working hours deleted successfully');

      // Sprawdź czy rzeczywiście usunięto
      const checkResponse = await request(app)
        .get(`/working-hours/company/${companyId}`);
      
      const deletedItem = Array.isArray(checkResponse.body.workingHours)
        ? checkResponse.body.workingHours.find((wh: { id: number }) => wh.id === workingHoursId)
        : undefined;
      expect(deletedItem).toBeUndefined();
    });

    it('should reject deletion by WORKER', async () => {
      // Utwórz nowe godziny pracy do testowania
      const result = db.prepare(`
        INSERT INTO working_hours (companyId, dayOfWeek, startTime, endTime, isActive)
        VALUES (?, 5, '08:00', '16:00', 1)
      `).run(companyId);
      const newWorkingHoursId = Number(result.lastInsertRowid);

      const response = await workerAgent
        .delete(`/working-hours/${newWorkingHoursId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent working hours', async () => {
      const response = await ownerAgent
        .delete('/working-hours/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Working hours not found');
    });
  });
});
