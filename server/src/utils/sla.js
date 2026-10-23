import { HOUR_MS, PRIORITY_RANK, SLA_AT_RISK_RATIO } from './constants.js';

/*
 * SLA model (calendar time, not business hours):
 *   - The SLA clock starts when the task is created.
 *   - slaHours is the target time to complete it. slaDueAt = createdAt + slaHours.
 *   - It stops when the task reaches a "done" stage (completedAt).
 *
 * SLA is different from the due date:
 *   - Overdue  = the user-chosen deadline (dueDate) passed and the task is not done.
 *   - Breached = the task took (or is taking) longer than its SLA target.
 *   A task can be overdue but within SLA, or breached but not overdue.
 */

/**
 * Pre-computes the fields that let MongoDB filter by SLA health with simple, indexable
 * range queries instead of per-document arithmetic. Called from the Task pre-validate hook
 * and by the seed script (which inserts raw documents).
 */
export function applyDerivedFields(task, now = new Date()) {
  task.priorityRank = PRIORITY_RANK[task.priority] ?? PRIORITY_RANK.medium;

  const start = task.createdAt ? new Date(task.createdAt) : now;
  if (task.slaHours > 0) {
    const windowMs = task.slaHours * HOUR_MS;
    task.slaDueAt = new Date(start.getTime() + windowMs);
    task.slaRiskAt = new Date(start.getTime() + windowMs * SLA_AT_RISK_RATIO);
    task.slaMet =
      task.status === 'done' && task.completedAt
        ? new Date(task.completedAt).getTime() <= task.slaDueAt.getTime()
        : null;
  } else {
    task.slaDueAt = null;
    task.slaRiskAt = null;
    task.slaMet = null;
  }
  return task;
}

/**
 * Live SLA snapshot for one task. Pure function — easy to unit test.
 * Returns health: on_track | at_risk | breached | met | none.
 */
export function computeSla(task, now = new Date()) {
  const targetHours = Number(task.slaHours) || 0;
  const createdAt = task.createdAt ? new Date(task.createdAt) : null;

  if (!targetHours || !createdAt || Number.isNaN(createdAt.getTime())) {
    return { health: 'none', targetHours: null, elapsedMs: null, remainingMs: null, percentUsed: null, dueAt: null };
  }

  const isDone = task.status === 'done';
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;
  // A done task without completedAt (legacy/bad data) is measured up to now rather than crashing.
  const end = isDone && completedAt ? completedAt : now;

  const windowMs = targetHours * HOUR_MS;
  const elapsedMs = Math.max(0, end.getTime() - createdAt.getTime());
  const remainingMs = windowMs - elapsedMs;
  const percentUsed = Math.round((elapsedMs / windowMs) * 100);

  let health;
  if (isDone) health = remainingMs >= 0 ? 'met' : 'breached';
  else if (remainingMs < 0) health = 'breached';
  else if (elapsedMs >= windowMs * SLA_AT_RISK_RATIO) health = 'at_risk';
  else health = 'on_track';

  return {
    health,
    targetHours,
    elapsedMs,
    remainingMs,
    percentUsed,
    dueAt: new Date(createdAt.getTime() + windowMs),
  };
}

export function isOverdue(task, now = new Date()) {
  return task.status !== 'done' && !!task.dueDate && new Date(task.dueDate).getTime() < now.getTime();
}

/** Time spent in each stage, summed across visits. Open visits are measured up to now. */
export function stageDurations(stageHistory = [], now = new Date()) {
  const totals = new Map();
  for (const visit of stageHistory) {
    if (!visit?.enteredAt) continue; // tolerate incomplete history
    const end = visit.exitedAt ? new Date(visit.exitedAt) : now;
    const ms = Math.max(0, end.getTime() - new Date(visit.enteredAt).getTime());
    const key = String(visit.stage);
    const prev = totals.get(key) ?? { stage: key, stageName: visit.stageName, durationMs: 0, visits: 0 };
    prev.durationMs += ms;
    prev.visits += 1;
    prev.stageName = visit.stageName ?? prev.stageName;
    totals.set(key, prev);
  }
  return [...totals.values()];
}
