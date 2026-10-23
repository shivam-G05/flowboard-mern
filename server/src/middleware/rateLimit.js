import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const limiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

// Slows down password guessing.
export const loginLimiter = limiter(10, 'Too many sign-in attempts. Please try again in 15 minutes.');

// Stops the reset endpoints being used to spam inboxes or brute-force tokens.
export const passwordResetLimiter = limiter(5, 'Too many password reset requests. Please try again later.');
