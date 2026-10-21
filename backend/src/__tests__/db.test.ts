import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';

describe('Database Connection Resilience', () => {
  it('connects successfully to mongodb (in-memory fallback when no atlas uri)', async () => {
    const conn = await connectDB();
    expect(conn.connection.readyState).toBe(1); // 1 = connected
  });

  afterAll(async () => {
    await disconnectDB();
  });
});
