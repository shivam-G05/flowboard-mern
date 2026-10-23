import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { sanitizeBody } from './middleware/sanitize.js';
import apiRoutes from './routes/index.js';

/** Builds the Express app without starting a server, so tests can call it with supertest. */
export function createApp() {
  const app = express();

  if (env.isProduction) app.set('trust proxy', 1); // correct client IPs for rate limiting behind a load balancer
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true })); // credentials → allow the auth cookie
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeBody);

  if (env.NODE_ENV === 'development') {
    // Tiny request log: method, path (no query string, so nothing sensitive), status, duration.
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - started}ms`));
      next();
    });
  }

  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
