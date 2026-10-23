import { listRecentActivity } from '../services/activity.service.js';
import { getDashboardSummary } from '../services/analytics.service.js';
import { ok } from '../utils/respond.js';

export async function summary(req, res) {
  ok(res, await getDashboardSummary(req.user.id, req.valid.query));
}

export async function recentActivity(req, res) {
  ok(res, await listRecentActivity(req.user.id, req.valid.query.limit));
}
