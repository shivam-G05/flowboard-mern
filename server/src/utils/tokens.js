import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AUTH_COOKIE } from './constants.js';

export function signAuthToken(user) {
  // sub = user id, sv = session version (see User.sessionVersion). No personal data in the token.
  return jwt.sign({ sub: user._id.toString(), sv: user.sessionVersion ?? 0 }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

const cookieOptions = () => ({
  httpOnly: true, // not readable from JavaScript → XSS cannot steal the session
  secure: env.isProduction, // HTTPS-only in production
  sameSite: 'lax', // not sent on cross-site POST/PATCH/DELETE → basic CSRF protection
  path: '/',
});

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

/** Random, URL-safe reset token. The raw value goes in the email; only its hash is stored. */
export function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
