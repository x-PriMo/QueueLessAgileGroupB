import request from 'supertest';
import app from '../src/index';
import db from '../src/lib/db';

describe('Working Hours API', () => {
  let companyId: number;

  beforeAll(() => {
    // Utwórz firmę testową
    const companyResult = db.prepare(`
      INSERT INTO companies (name, timezone) 
      VALUES ('Test Company', 'Europe/Warsaw')
    `).run();
    companyId = Number(companyResult.lastInsertRowid);
  });

  test('GET /working-hours/company/:companyId should return working hours', async () => {
    const response = await request(app)
      .get(`/working-hours/company/${companyId}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('workingHours');
    expect(Array.isArray(response.body.workingHours)).toBe(true);
  });

  test('GET /working-hours/company/invalid should return 400', async () => {
    const response = await request(app)
      .get('/working-hours/company/invalid')
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
  });
});