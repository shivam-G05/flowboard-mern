import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { DAY_MS, STATUSES } from '../utils/constants.js';
import { dayBounds, localDayKey, offsetToTimezone } from '../utils/time.js';
import { listRecentActivity } from './activity.service.js';
import { toTaskDTO } from './task.service.js';
import { getOrCreateWorkflow } from './workflow.service.js';

const TREND_DAYS = 14;
const CARD_FIELDS = { title: 1, priority: 1, status: 1, stage: 1, dueDate: 1, createdAt: 1, completedAt: 1, slaHours: 1, tags: 1 };

// "Has a value" check that is false for both null and missing fields inside aggregation expressions.
const has = (field) => ({ $gt: [field, null] });
const openTask = { $ne: ['$status', 'done'] };

/**
 * Everything the dashboard needs, computed by MongoDB in a single $facet aggregation
 * (one pass over the user's tasks) plus one small activity query. Nothing is hard-coded.
 */
export async function getDashboardSummary(ownerId, { tzOffset = 0 } = {}) {
  const owner = new mongoose.Types.ObjectId(ownerId);
  const now = new Date();
  const today = dayBounds(now, tzOffset);
  const weekAhead = new Date(today.end.getTime() + 7 * DAY_MS);
  const trendStart = new Date(today.start.getTime() - (TREND_DAYS - 1) * DAY_MS);
  const timezone = offsetToTimezone(tzOffset);
  const dayKey = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone } });

  const [facets] = await Task.aggregate([
    { $match: { owner } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        openByPriority: [{ $match: { status: { $ne: 'done' } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }],
        overdue: [{ $match: { status: { $ne: 'done' }, dueDate: { $lt: now } } }, { $count: 'count' }],
        dueToday: [
          { $match: { status: { $ne: 'done' }, dueDate: { $gte: today.start, $lte: today.end } } },
          { $sort: { dueDate: 1 } },
          { $limit: 6 },
          { $project: CARD_FIELDS },
        ],
        dueTodayCount: [{ $match: { status: { $ne: 'done' }, dueDate: { $gte: today.start, $lte: today.end } } }, { $count: 'count' }],
        upcoming: [
          { $match: { status: { $ne: 'done' }, dueDate: { $gt: today.end, $lte: weekAhead } } },
          { $sort: { dueDate: 1 } },
          { $limit: 6 },
          { $project: CARD_FIELDS },
        ],
        sla: [
          { $match: { slaDueAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              tracked: { $sum: 1 },
              met: { $sum: { $cond: [{ $eq: ['$slaMet', true] }, 1, 0] } },
              breachedClosed: { $sum: { $cond: [{ $eq: ['$slaMet', false] }, 1, 0] } },
              breachedOpen: { $sum: { $cond: [{ $and: [openTask, { $lte: ['$slaDueAt', now] }] }, 1, 0] } },
              atRisk: { $sum: { $cond: [{ $and: [openTask, { $lte: ['$slaRiskAt', now] }, { $gt: ['$slaDueAt', now] }] }, 1, 0] } },
              onTrack: { $sum: { $cond: [{ $and: [openTask, { $gt: ['$slaRiskAt', now] }] }, 1, 0] } },
            },
          },
        ],
        completion: [
          { $match: { status: 'done', completedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgLeadMs: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
              completedThisWeek: { $sum: { $cond: [{ $gte: ['$completedAt', new Date(now - 7 * DAY_MS)] }, 1, 0] } },
            },
          },
        ],
        createdTrend: [{ $match: { createdAt: { $gte: trendStart } } }, { $group: { _id: dayKey('$createdAt'), count: { $sum: 1 } } }],
        completedTrend: [
          { $match: { status: 'done', completedAt: { $gte: trendStart } } },
          { $group: { _id: dayKey('$completedAt'), count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of facets.byStatus) statusCounts[row._id] = row.count;
  const total = STATUSES.reduce((sum, s) => sum + statusCounts[s], 0);

  const sla = facets.sla[0] ?? { tracked: 0, met: 0, breachedClosed: 0, breachedOpen: 0, atRisk: 0, onTrack: 0 };
  const resolved = sla.met + sla.breachedClosed + sla.breachedOpen;
  const completion = facets.completion[0] ?? { count: 0, avgLeadMs: null, completedThisWeek: 0 };

  // Fill every day of the window so the chart has no gaps.
  const created = new Map(facets.createdTrend.map((r) => [r._id, r.count]));
  const completed = new Map(facets.completedTrend.map((r) => [r._id, r.count]));
  const trend = Array.from({ length: TREND_DAYS }, (_, i) => {
    const date = localDayKey(new Date(trendStart.getTime() + i * DAY_MS), tzOffset);
    return { date, created: created.get(date) ?? 0, completed: completed.get(date) ?? 0 };
  });

  const [recentActivity, stageStats] = await Promise.all([listRecentActivity(owner, 8), getStageStats(ownerId)]);

  return {
    generatedAt: now,
    totals: {
      total,
      todo: statusCounts.todo,
      inProgress: statusCounts.in_progress,
      completed: statusCounts.done,
      pending: statusCounts.todo + statusCounts.in_progress,
      overdue: facets.overdue[0]?.count ?? 0,
      dueToday: facets.dueTodayCount[0]?.count ?? 0,
      completedThisWeek: completion.completedThisWeek,
    },
    completionRate: total ? Math.round((statusCounts.done / total) * 100) : 0,
    avgCompletionMs: completion.avgLeadMs,
    sla: {
      tracked: sla.tracked,
      onTrack: sla.onTrack,
      atRisk: sla.atRisk,
      breached: sla.breachedOpen + sla.breachedClosed,
      breachedOpen: sla.breachedOpen,
      met: sla.met,
      // Share of tasks whose SLA outcome is known (met or breached) that met it.
      complianceRate: resolved ? Math.round((sla.met / resolved) * 100) : null,
    },
    priorityBreakdown: ['urgent', 'high', 'medium', 'low'].map((p) => ({
      priority: p,
      count: facets.openByPriority.find((r) => r._id === p)?.count ?? 0,
    })),
    trend,
    dueToday: facets.dueToday.map((t) => toTaskDTO(t, now)),
    upcoming: facets.upcoming.map((t) => toTaskDTO(t, now)),
    recentActivity,
    stageStats,
  };
}

/**
 * Per-stage statistics for the pipeline columns:
 *   - current: how many tasks are in the stage now, how many are overdue / SLA breached, average age in stage
 *   - history: from stageHistory, how many tasks have passed through and their average time spent there
 */
export async function getStageStats(ownerId) {
  const owner = new mongoose.Types.ObjectId(ownerId);
  const now = new Date();
  const workflow = await getOrCreateWorkflow(ownerId);

  const [current, history] = await Promise.all([
    Task.aggregate([
      { $match: { owner } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          overdue: { $sum: { $cond: [{ $and: [openTask, has('$dueDate'), { $lt: ['$dueDate', now] }] }, 1, 0] } },
          slaBreached: {
            $sum: {
              $cond: [{ $or: [{ $eq: ['$slaMet', false] }, { $and: [openTask, has('$slaDueAt'), { $lte: ['$slaDueAt', now] }] }] }, 1, 0],
            },
          },
          slaAtRisk: {
            $sum: {
              $cond: [{ $and: [openTask, has('$slaRiskAt'), { $lte: ['$slaRiskAt', now] }, { $gt: ['$slaDueAt', now] }] }, 1, 0],
            },
          },
          avgAgeMs: { $avg: { $cond: [has('$stageEnteredAt'), { $subtract: [now, '$stageEnteredAt'] }, null] } },
          // For done stages: average total time from creation to completion ("lead time").
          avgLeadMs: {
            $avg: { $cond: [{ $and: [{ $eq: ['$status', 'done'] }, has('$completedAt')] }, { $subtract: ['$completedAt', '$createdAt'] }, null] },
          },
        },
      },
    ]),
    Task.aggregate([
      // $type: 'date' = "at least one visit has ended" ($ne: null on an array would require *every* visit to have ended).
      { $match: { owner, 'stageHistory.exitedAt': { $type: 'date' } } },
      { $unwind: '$stageHistory' },
      { $match: { 'stageHistory.exitedAt': { $type: 'date' } } },
      {
        $group: {
          _id: '$stageHistory.stage',
          exits: { $sum: 1 },
          avgDurationMs: { $avg: { $subtract: ['$stageHistory.exitedAt', '$stageHistory.enteredAt'] } },
        },
      },
    ]),
  ]);

  const currentById = new Map(current.map((r) => [String(r._id), r]));
  const historyById = new Map(history.map((r) => [String(r._id), r]));

  return workflow.stages.map((stage) => {
    const c = currentById.get(String(stage._id)) ?? {};
    const h = historyById.get(String(stage._id)) ?? {};
    return {
      stageId: stage._id,
      name: stage.name,
      category: stage.category,
      color: stage.color,
      count: c.count ?? 0,
      overdue: c.overdue ?? 0,
      slaBreached: c.slaBreached ?? 0,
      slaAtRisk: c.slaAtRisk ?? 0,
      avgAgeMs: c.avgAgeMs ?? null,
      avgLeadMs: c.avgLeadMs ?? null,
      exits: h.exits ?? 0,
      avgDurationMs: h.avgDurationMs ?? null,
    };
  });
}
