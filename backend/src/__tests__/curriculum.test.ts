import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connectDB, disconnectDB } from '../config/db.js';
import app from '../server.js';
import { seedDatabase } from '../utils/seeder.js';
import { Subject } from '../models/Subject.js';
import { Module } from '../models/Module.js';

describe('Sprint 2 - Curriculum & Sequential Module Progression Gating', () => {
  let facultyToken = '';
  let studentToken = '';
  let seededSubjectId = '';

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    // Log in faculty
    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: 'faculty@quikz.edu', password: 'Faculty@123' });
    facultyToken = facultyLogin.body.token;

    // Log in student
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ loginIdentifier: 'student@quikz.edu', password: 'Student@123' });
    studentToken = studentLogin.body.token;

    const subject = await Subject.findOne({ code: 'CS101' });
    seededSubjectId = subject!._id.toString();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('allows students and faculty to list all subjects', async () => {
    const res = await request(app)
      .get('/api/subjects')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subjects.length).toBeGreaterThan(0);
    expect(res.body.subjects[0].code).toBe('CS101');
  });

  it('prevents students from creating subjects', async () => {
    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Hacking 101',
        code: 'HACK101',
        term: '1st Semester',
        yearLevel: '1st Year'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Requires faculty privileges');
  });

  it('enforces sequential prerequisite locking for students on modules', async () => {
    const res = await request(app)
      .get(`/api/subjects/${seededSubjectId}/modules`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const { modules } = res.body;
    expect(modules.length).toBe(3);

    // Module 1 is the start of the course -> must be unlocked
    expect(modules[0].orderIndex).toBe(1);
    expect(modules[0].isLocked).toBe(false);

    // Module 2 is gated behind Module 1 completion -> must be locked
    expect(modules[1].orderIndex).toBe(2);
    expect(modules[1].isLocked).toBe(true);

    // Module 3 is gated behind Module 2 completion -> must be locked
    expect(modules[2].orderIndex).toBe(3);
    expect(modules[2].isLocked).toBe(true);
  });

  it('unlocks subsequent module (Module 2) after student completes prerequisite (Module 1)', async () => {
    // 1. Fetch modules
    const initRes = await request(app)
      .get(`/api/subjects/${seededSubjectId}/modules`)
      .set('Authorization', `Bearer ${studentToken}`);
    const module1Id = initRes.body.modules[0]._id;

    // 2. Complete Module 1
    const completeRes = await request(app)
      .post(`/api/modules/${module1Id}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.unlockedNext).toBe(true);

    // 3. Re-fetch modules to verify sequential unlock
    const updatedRes = await request(app)
      .get(`/api/subjects/${seededSubjectId}/modules`)
      .set('Authorization', `Bearer ${studentToken}`);

    const modules = updatedRes.body.modules;

    // Module 1 is now completed
    expect(modules[0].isCompleted).toBe(true);
    expect(modules[0].isLocked).toBe(false);

    // Module 2 is now UNLOCKED
    expect(modules[1].isLocked).toBe(false);

    // Module 3 remains locked until Module 2 is completed
    expect(modules[2].isLocked).toBe(true);
  });
});
