import { Activity } from '../models/Activity.js';

/** Writes one or more activity events for a task. Failures here never break the main request. */
export async function recordActivity(ownerId, task, events) {
  const list = (Array.isArray(events) ? events : [events]).filter(Boolean);
  if (!list.length) return;
  try {
    await Activity.insertMany(
      list.map((e) => ({
        owner: ownerId,
        task: task._id,
        taskTitle: task.title,
        type: e.type,
        changes: e.changes ?? [],
      })),
    );
  } catch (err) {
    console.error('[activity] failed to record event', err.message);
  }
}

export function listTaskActivity(ownerId, taskId, limit = 100) {
  return Activity.find({ owner: ownerId, task: taskId }).sort({ createdAt: -1 }).limit(limit).lean();
}

export function listRecentActivity(ownerId, limit = 10) {
  return Activity.find({ owner: ownerId }).sort({ createdAt: -1 }).limit(limit).lean();
}
