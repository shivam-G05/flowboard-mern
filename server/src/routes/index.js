import { Router } from 'express';
import { env } from '../config/env.js';
import { databaseState } from '../config/db.js';
import { getOutbox } from '../services/mailer.js';
import { ok } from '../utils/respond.js';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import taskRoutes from './task.routes.js';
import workflowRoutes from './workflow.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  const db = databaseState();
  res.status(db === 'connected' ? 200 : 503).json({ data: { status: db === 'connected' ? 'ok' : 'degraded', db, uptime: Math.round(process.uptime()) } });
});

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/workflow', workflowRoutes);
router.use('/dashboard', dashboardRoutes);

// Development-only stand-in for an email inbox (like MailHog). Never registered in production.
if (!env.isProduction && env.DEV_MAILBOX) {
  router.get('/dev/mailbox', (_req, res) => ok(res, getOutbox().slice(0, 5)));
}

export default router;
