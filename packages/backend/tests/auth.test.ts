import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import session from 'express-session';
import authRoutes from '../src/routes/auth';
import './setup';

const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax', secure: false },
}));
app.use('/auth', authRoutes);

// Error handler for debugging
app.use((err: any, req: any, res: any, next: any) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('Test error:', err);
  res.status(500).json({ error: message, stack });
});

describe('Auth API', () => {
  describe('POST /auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Konto zostało utworzone pomyślnie');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Błędy walidacji');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details[0].field).toBe('email');
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Błędy walidacji');
      expect(response.body.details[0].field).toBe('password');
    });

    it('should reject password without required complexity', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test3@example.com',
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Błędy walidacji');
      expect(response.body.details[0].field).toBe('password');
      expect(response.body.details[0].message).toContain('małą literę, jedną wielką literę i jedną cyfrę');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password456'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Użytkownik z tym adresem e-mail już istnieje');
      expect(response.body).toHaveProperty('field', 'email');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password123'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message', 'Zalogowano pomyślnie');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.user.role).toBe('USER');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Nieprawidłowy adres e-mail lub hasło');
      expect(response.body).toHaveProperty('field', 'credentials');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Nieprawidłowy adres e-mail lub hasło');
      expect(response.body).toHaveProperty('field', 'credentials');
    });

    it('should reject malformed email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Błędy walidacji');
      expect(response.body.details[0].field).toBe('email');
    });

    it('should reject empty password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Błędy walidacji');
      expect(response.body.details[0].field).toBe('password');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('message', 'Wylogowano pomyślnie');
    });
  });

  describe('GET /auth/me', () => {
    it('should return null when not logged in', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user', null);
    });
  });
});
