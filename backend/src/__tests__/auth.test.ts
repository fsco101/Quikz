import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connectDB, disconnectDB } from '../config/db.js';
import app from '../server.js';
import { seedDatabase } from '../utils/seeder.js';
import { User } from '../models/User.js';

describe('Sprint 1 - Authentication & Academic Honor Gate', () => {
  beforeAll(async () => {
    await connectDB();
    await seedDatabase();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('rejects registration if terms and academic honor code are not accepted', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_user_no_terms',
        email: 'noterms@quikz.edu',
        password: 'Password123',
        fullName: 'No Terms',
        surname: 'User',
        role: 'student',
        termsAccepted: false
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Terms & Conditions must be accepted');
  });

  it('registers a new student successfully when terms are accepted', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'maria_clara',
        email: 'maria@quikz.edu',
        password: 'Password123!',
        fullName: 'Maria Clara',
        surname: 'Santos',
        role: 'student',
        yearLevel: '2nd Year',
        section: 'Section B',
        termsAccepted: true
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.termsAccepted).toBe(true);
  });

  it('authenticates seeded faculty demo account (faculty@quikz.edu)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'faculty@quikz.edu',
        password: 'Faculty@123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('faculty');
  });

  it('authenticates seeded student demo account (student@quikz.edu)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'student@quikz.edu',
        password: 'Student@123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('student');
  });

  it('retrieves user profile via /api/auth/me using JWT token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        loginIdentifier: 'student@quikz.edu',
        password: 'Student@123'
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('student@quikz.edu');
  });
});
