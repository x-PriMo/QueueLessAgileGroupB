import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import db from '../src/lib/db';
import bcrypt from 'bcrypt';

describe('Services API - Slots Algorithm', () => {
  let companyId: number;
  let serviceId: number;
  let workerId: number;
  let ownerId: number;
  let sessionCookie: string;

  beforeEach(async () => {
    // Create test company
    const companyResult = db.prepare('INSERT INTO companies (name, timezone, slotMinutes, traineeExtraMinutes) VALUES (?, ?, ?, ?)')
      .run('Test Company', 'Europe/Warsaw', 30, 15);
    companyId = companyResult.lastInsertRowid as number;

    // Create test owner
    const hashedPassword = await bcrypt.hash('password123', 10);
    const userResult = db.prepare('INSERT INTO users (email, passwordHash, role, canServe) VALUES (?, ?, ?, ?)')
      .run('owner@test.com', hashedPassword, 'OWNER', 1);
    ownerId = userResult.lastInsertRowid as number;

    // Add owner to company
    db.prepare('INSERT INTO company_members (companyId, userId, role) VALUES (?, ?, ?)')
      .run(companyId, ownerId, 'OWNER');

    // Create test worker
    const workerResult = db.prepare('INSERT INTO users (email, passwordHash, role, canServe, isTrainee) VALUES (?, ?, ?, ?, ?)')
      .run('worker@test.com', hashedPassword, 'WORKER', 1, 0);
    workerId = workerResult.lastInsertRowid as number;

    // Add worker to company
    db.prepare('INSERT INTO company_members (companyId, userId, role) VALUES (?, ?, ?)')
      .run(companyId, workerId, 'WORKER');

    // Create test service
    const serviceResult = db.prepare('INSERT INTO services (companyId, name, durationMinutes, price, description, isActive) VALUES (?, ?, ?, ?, ?, ?)')
      .run(companyId, 'Test Service', 45, 100.00, 'Test service description', 1);
    serviceId = serviceResult.lastInsertRowid as number;

    // Assign service to worker
    db.prepare('INSERT INTO worker_services (workerId, serviceId, canPerform) VALUES (?, ?, ?)')
      .run(workerId, serviceId, 1);

    // Set up working hours (Monday-Friday, 9:00-17:00)
    for (let day = 1; day <= 5; day++) {
      db.prepare('INSERT INTO working_hours (companyId, dayOfWeek, startTime, endTime, isActive) VALUES (?, ?, ?, ?, ?)')
        .run(companyId, day, '09:00', '17:00', 1);
    }

    // Create shift for today
    const today = new Date().toISOString().split('T')[0];
    const shiftResult = db.prepare('INSERT INTO shifts (companyId, date, startTime, endTime) VALUES (?, ?, ?, ?)')
      .run(companyId, today, '09:00', '17:00');
    const shiftId = shiftResult.lastInsertRowid as number;

    // Assign worker to shift
    db.prepare('INSERT INTO worker_shifts (workerId, shiftId) VALUES (?, ?)')
      .run(workerId, shiftId);

    // Login as owner
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'owner@test.com', password: 'password123' });
    
    sessionCookie = loginResponse.headers['set-cookie'][0];
  });

  describe('GET /services/companies/:companyId/services/:serviceId/slots', () => {
    it('should return available slots for a service', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${today}`)
        .expect(200);

      expect(response.body).toHaveProperty('slots');
      expect(response.body).toHaveProperty('serviceDuration', 45);
      expect(response.body).toHaveProperty('workingHours');
      expect(Array.isArray(response.body.slots)).toBe(true);
      
      // Should have slots starting from 09:00
      const firstSlot = response.body.slots[0];
      expect(firstSlot).toHaveProperty('startTime', '09:00');
      expect(firstSlot).toHaveProperty('endTime', '09:45');
      expect(firstSlot).toHaveProperty('isAvailable', true);
      expect(firstSlot).toHaveProperty('availableWorkers');
      expect(Array.isArray(firstSlot.availableWorkers)).toBe(true);
      expect(firstSlot.availableWorkers.length).toBeGreaterThan(0);
    });

    it('should respect worker availability', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Create a reservation for the first slot
      db.prepare('INSERT INTO reservations (companyId, email, date, startTime, status, serviceId, workerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(companyId, 'test@customer.com', today, '09:00', 'ACCEPTED', serviceId, workerId);

      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${today}`)
        .expect(200);

      // First slot should not be available anymore
      const firstSlot = response.body.slots[0];
      expect(firstSlot.isAvailable).toBe(false);
      expect(firstSlot.availableWorkers.length).toBe(0);

      // Second slot should still be available
      const secondSlot = response.body.slots[1];
      expect(secondSlot.isAvailable).toBe(true);
      expect(secondSlot.availableWorkers.length).toBeGreaterThan(0);
    });

    it('should filter by specific worker', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${today}&workerId=${workerId}`)
        .expect(200);

      expect(response.body.slots).toBeDefined();
      // All slots should only show the specific worker
      response.body.slots.forEach((slot: any) => {
        if (slot.isAvailable) {
          expect(slot.availableWorkers.length).toBe(1);
          expect(slot.availableWorkers[0].id).toBe(workerId);
        }
      });
    });

    it('should handle trainee workers correctly', async () => {
      // Create trainee worker
      const traineeResult = db.prepare('INSERT INTO users (email, passwordHash, role, canServe, isTrainee) VALUES (?, ?, ?, ?, ?)')
        .run('trainee@test.com', await bcrypt.hash('password123', 10), 'WORKER', 1, 1);
      const traineeId = traineeResult.lastInsertRowid as number;
      
      db.prepare('INSERT INTO company_members (companyId, userId, role) VALUES (?, ?, ?)')
        .run(companyId, traineeId, 'WORKER');
      
      db.prepare('INSERT INTO worker_services (workerId, serviceId, canPerform) VALUES (?, ?, ?)')
        .run(traineeId, serviceId, 1);

      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${today}`)
        .expect(200);

      // Should include both regular and trainee workers
      const availableWorkers = response.body.slots
        .filter((slot: any) => slot.isAvailable)
        .flatMap((slot: any) => slot.availableWorkers);
      
      const hasTrainee = availableWorkers.some((worker: any) => worker.isTrainee === true);
      expect(hasTrainee).toBe(true);
    });

    it('should handle breaks correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Add a break during working hours
      const shiftId = db.prepare('SELECT id FROM shifts WHERE companyId = ? AND date = ?').get(companyId, today).id;
      db.prepare('INSERT INTO breaks (shiftId, startTime, endTime) VALUES (?, ?, ?)')
        .run(shiftId, '12:00', '13:00');

      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${today}`)
        .expect(200);

      // Slots during break time should not be available
      const breakSlot = response.body.slots.find((slot: any) => slot.startTime === '12:00');
      expect(breakSlot).toBeDefined();
      expect(breakSlot.isAvailable).toBe(false);
    });

    it('should return empty slots for non-working days', async () => {
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + (7 - sunday.getDay())); // Next Sunday
      const sundayStr = sunday.toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots?date=${sundayStr}`)
        .expect(200);

      expect(response.body.slots).toEqual([]);
    });

    it('should handle missing service', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      await request(app)
        .get(`/services/companies/${companyId}/services/9999/slots?date=${today}`)
        .expect(404);
    });

    it('should require date parameter', async () => {
      await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}/slots`)
        .expect(400);
    });
  });

  describe('Services CRUD operations', () => {
    it('should create a new service', async () => {
      const newService = {
        name: 'New Test Service',
        durationMinutes: 60,
        price: 150.00,
        description: 'New test service',
        isActive: true
      };

      const response = await request(app)
        .post(`/services/companies/${companyId}/services`)
        .set('Cookie', sessionCookie)
        .send(newService)
        .expect(201);

      expect(response.body).toHaveProperty('service');
      expect(response.body.service.name).toBe(newService.name);
      expect(response.body.service.durationMinutes).toBe(newService.durationMinutes);
      expect(response.body.service.price).toBe(newService.price);
    });

    it('should update an existing service', async () => {
      const updatedService = {
        name: 'Updated Service',
        durationMinutes: 90,
        price: 200.00,
        description: 'Updated description',
        isActive: false
      };

      const response = await request(app)
        .put(`/services/companies/${companyId}/services/${serviceId}`)
        .set('Cookie', sessionCookie)
        .send(updatedService)
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body.service.name).toBe(updatedService.name);
      expect(response.body.service.durationMinutes).toBe(updatedService.durationMinutes);
      expect(response.body.service.price).toBe(updatedService.price);
      expect(response.body.service.isActive).toBe(0); // SQLite stores boolean as integer
    });

    it('should get all services for a company', async () => {
      const response = await request(app)
        .get(`/services/companies/${companyId}/services`)
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
      expect(response.body.services.length).toBeGreaterThan(0);
    });

    it('should get service details', async () => {
      const response = await request(app)
        .get(`/services/companies/${companyId}/services/${serviceId}`)
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body.service.id).toBe(serviceId);
      expect(response.body.service.companyId).toBe(companyId);
    });

    it('should soft delete a service', async () => {
      await request(app)
        .delete(`/services/companies/${companyId}/services/${serviceId}`)
        .set('Cookie', sessionCookie)
        .expect(204);

      // Verify service is marked as inactive
      const service = db.prepare('SELECT isActive FROM services WHERE id = ?').get(serviceId);
      expect(service.isActive).toBe(0);
    });
  });
});