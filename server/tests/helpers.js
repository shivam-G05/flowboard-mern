import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

export const app = createApp();

/** Connects to the dedicated test database and wipes it so every test file starts clean. */
export async function setupDatabase() {
  await connectDatabase(process.env.MONGO_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function teardownDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

let counter = 0;

/** Registers a fresh user and returns a supertest agent that carries their session cookie. */
export async function createUserAgent(overrides = {}) {
  counter += 1;
  const agent = request.agent(app);
  const credentials = {
    name: `Tester ${counter}`,
    email: `tester${counter}-${Date.now()}@example.com`,
    password: 'Passw0rd123',
    ...overrides,
  };
  const res = await agent.post('/api/auth/register').send(credentials);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.data.user, credentials };
}
