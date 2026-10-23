import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { User } from '../src/models/User.js';
import { getOutbox } from '../src/services/mailer.js';
import { app, createUserAgent, setupDatabase, teardownDatabase } from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('registration and login', () => {
  it('registers a user, sets an HTTP-only cookie and never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ADA@example.com', password: 'Analytical1' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'ada@example.com');
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.doesNotMatch(JSON.stringify(res.body), /\$2[aby]\$/); // no bcrypt hash anywhere

    const cookie = res.headers['set-cookie'][0];
    assert.match(cookie, /fb_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const stored = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash');
    assert.notEqual(stored.passwordHash, 'Analytical1');
    assert.match(stored.passwordHash, /^\$2[aby]\$/);
  });

  it('rejects duplicate emails and weak passwords', async () => {
    const dup = await request(app).post('/api/auth/register').send({ name: 'Ada', email: 'ada@example.com', password: 'Analytical1' });
    assert.equal(dup.status, 409);

    const weak = await request(app).post('/api/auth/register').send({ name: 'Bob', email: 'bob@example.com', password: 'short' });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
  });

  it('logs in with correct credentials and rejects wrong ones with a generic message', async () => {
    const good = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'Analytical1' });
    assert.equal(good.status, 200);

    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'nope12345' });
    const unknownUser = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'nope12345' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message);
  });

  it('rejects NoSQL operator injection in the login body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });
});

describe('protected routes', () => {
  it('requires a session cookie', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/tasks')).status, 401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'fb_session=not.a.jwt');
    assert.equal(res.status, 401);
  });

  it('returns the current user and clears the cookie on logout', async () => {
    const { agent, user } = await createUserAgent();
    const me = await agent.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, user.email);

    await agent.post('/api/auth/logout');
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });
});

describe('password reset', () => {
  it('responds identically for known and unknown emails', async () => {
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'ada@example.com' });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    assert.equal(known.status, 200);
    assert.deepEqual(known.body, unknown.body);
    assert.doesNotMatch(JSON.stringify(known.body), /token/i);
  });

  it('resets the password with a single-use token and revokes old sessions', async () => {
    const { agent, credentials } = await createUserAgent();
    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });

    const mail = getOutbox().find((m) => m.to === credentials.email);
    const token = new URL(mail.actionUrl).searchParams.get('token');
    assert.match(token, /^[a-f\d]{64}$/);

    // Only a hash is stored in the database.
    const stored = await User.findOne({ email: credentials.email }).select('+passwordResetTokenHash');
    assert.notEqual(stored.passwordResetTokenHash, token);

    const reset = await request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd' });
    assert.equal(reset.status, 200);

    // Single use
    const reuse = await request(app).post('/api/auth/reset-password').send({ token, password: 'Another1pass' });
    assert.equal(reuse.status, 400);

    // Session created before the reset is no longer valid
    assert.equal((await agent.get('/api/auth/me')).status, 401);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password });
    const newLogin = await request(app).post('/api/auth/login').send({ email: credentials.email, password: 'NewPassw0rd' });
    assert.equal(oldLogin.status, 401);
    assert.equal(newLogin.status, 200);
  });

  it('rejects expired tokens', async () => {
    const { credentials } = await createUserAgent();
    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const token = new URL(getOutbox().find((m) => m.to === credentials.email).actionUrl).searchParams.get('token');

    await User.updateOne({ email: credentials.email }, { passwordResetExpiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd' });
    assert.equal(res.status, 400);
  });
});
