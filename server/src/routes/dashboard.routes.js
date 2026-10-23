import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { activityQuery, summaryQuery } from '../validators/dashboard.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', validate({ query: summaryQuery }), dashboard.summary);
router.get('/activity', validate({ query: activityQuery }), dashboard.recentActivity);

export default router;
