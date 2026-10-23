import { Activity } from '../models/Activity.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';
import { computeSla, isOverdue, stageDurations } from '../utils/sla.js';
import { escapeRegex } from '../utils/time.js';
import { recordActivity } from './activity.service.js';
import { moveTaskToStage } from './taskTransitions.js';
import { findStage, firstStageOfCategory, getOrCreateWorkflow } from './workflow.service.js';

// Fields whose changes are written to the activity log. Long text is logged as "changed" without content.
const TRACKED_FIELDS = ['title', 'description', 'startDate', 'estimatedHours', 'slaHours', 'tags', 'assignee'];
const EDITABLE_FIELDS = [...TRACKED_FIELDS, 'priority', 'dueDate'];

const SORT_MAP = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  dueDate: 'dueDate',
  priority: 'priorityRank',
  title: 'title',
};

/** Adds computed, read-only fields (SLA snapshot, overdue flag) to a task for the API response. */
export function toTaskDTO(task, now = new Date()) {
  const t = typeof task.toObject === 'function' ? task.toObject() : task;
  const { slaRiskAt, slaDueAt, slaMet, priorityRank, ...rest } = t;
  return {
    ...rest,
    sla: computeSla(t, now),
    isOverdue: isOverdue(t, now),
    timeInStageMs: t.stageEnteredAt ? Math.max(0, now - new Date(t.stageEnteredAt)) : null,
  };
}

function slaHealthFilter(health, now) {
  switch (health) {
    case 'none':
      return { slaDueAt: null };
    case 'on_track':
      return { status: { $ne: 'done' }, slaRiskAt: { $gt: now } };
    case 'at_risk':
      return { status: { $ne: 'done' }, slaRiskAt: { $lte: now }, slaDueAt: { $gt: now } };
    case 'breached':
      return { $or: [{ status: { $ne: 'done' }, slaDueAt: { $lte: now } }, { status: 'done', slaMet: false }] };
    case 'met':
      return { status: 'done', slaMet: true };
    default:
      return {};
  }
}

/** Turns validated query params into a MongoDB filter. Always scoped to the owner. */
export function buildTaskFilter(ownerId, q, now = new Date()) {
  const filter = { owner: ownerId };
  const and = [];

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }] });
  }
  if (q.priority?.length) filter.priority = { $in: q.priority };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.stage) filter.stage = q.stage;
  if (q.tag) filter.tags = q.tag;
  if (q.overdue === true) and.push({ status: { $ne: 'done' }, dueDate: { $lt: now } });
  if (q.overdue === false) and.push({ $or: [{ status: 'done' }, { dueDate: null }, { dueDate: { $gte: now } }] });
  if (q.sla) and.push(slaHealthFilter(q.sla, now));
  if (q.dueFrom || q.dueTo) {
    filter.dueDate = {};
    if (q.dueFrom) filter.dueDate.$gte = q.dueFrom;
    if (q.dueTo) filter.dueDate.$lte = q.dueTo;
  }

  if (and.length) filter.$and = and;
  return filter;
}

export async function listTasks(ownerId, q) {
  const now = new Date();
  const filter = buildTaskFilter(ownerId, q, now);
  const direction = q.order === 'asc' ? 1 : -1;
  const sort = { [SORT_MAP[q.sort]]: direction, _id: direction };

  let query = Task.find(filter)
    .select('-stageHistory') // list views don't need full history; keeps payloads small
    .sort(sort)
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .lean();
  if (q.sort === 'title') query = query.collation({ locale: 'en', strength: 2 }); // case-insensitive A→Z

  // Count and page fetch run in parallel; only one page of documents is ever loaded.
  const [items, total] = await Promise.all([query, Task.countDocuments(filter)]);
  return { items: items.map((t) => toTaskDTO(t, now)), total };
}

/** Loads a task only if it belongs to the user. Returns 404 (not 403) so ids of other users' tasks aren't confirmed. */
export async function getOwnedTask(ownerId, taskId) {
  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) throw AppError.notFound('Task not found');
  return task;
}

export async function getTaskDetail(ownerId, taskId) {
  const task = await getOwnedTask(ownerId, taskId);
  const now = new Date();
  return { ...toTaskDTO(task, now), stageDurations: stageDurations(task.stageHistory, now) };
}

async function resolveStage(workflow, { stageId, status }) {
  if (stageId) return findStage(workflow, stageId);
  if (status) return firstStageOfCategory(workflow, status);
  return workflow.stages[0];
}

export async function createTask(ownerId, input, { activityType = 'created', changes } = {}) {
  const workflow = await getOrCreateWorkflow(ownerId);
  const stage = await resolveStage(workflow, input);
  const now = new Date();

  const task = new Task({
    owner: ownerId,
    title: input.title,
    description: input.description ?? '',
    priority: input.priority ?? 'medium',
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    estimatedHours: input.estimatedHours ?? null,
    slaHours: input.slaHours ?? null,
    tags: [...new Set(input.tags ?? [])],
    assignee: input.assignee || null,
    stage: stage._id,
    status: stage.category,
    stageEnteredAt: now,
    stageHistory: [{ stage: stage._id, stageName: stage.name, enteredAt: now }],
    completedAt: stage.category === 'done' ? now : null,
  });
  await task.save();
  await recordActivity(ownerId, task, { type: activityType, changes });
  return task;
}

const sameValue = (a, b) => {
  if (a instanceof Date || b instanceof Date) return (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  return (a ?? null) === (b ?? null);
};

/** Applies a partial update and records one activity event per kind of change. */
export async function updateTask(ownerId, taskId, input) {
  const task = await getOwnedTask(ownerId, taskId);
  const events = [];
  const generic = [];

  for (const field of EDITABLE_FIELDS) {
    if (!(field in input)) continue;
    let next = input[field];
    if (field === 'tags') next = [...new Set(next)];
    if (field === 'assignee') next = next || null;
    const prev = task[field];
    if (sameValue(prev, next)) continue;

    task[field] = next;
    if (field === 'priority') events.push({ type: 'priority_changed', changes: [{ field, from: prev, to: next }] });
    else if (field === 'dueDate') events.push({ type: 'due_date_changed', changes: [{ field, from: prev ?? null, to: next ?? null }] });
    else if (field === 'description') generic.push({ field, from: null, to: null });
    else generic.push({ field, from: Array.isArray(prev) ? [...prev] : (prev ?? null), to: next ?? null });
  }
  if (generic.length) events.unshift({ type: 'updated', changes: generic });

  if (input.stageId || input.status) {
    const workflow = await getOrCreateWorkflow(ownerId);
    const target = input.stageId ? findStage(workflow, input.stageId) : null;
    // Changing only the status keeps the task where it is if its stage already has that category.
    if (target || input.status !== task.status) {
      events.push(...moveTaskToStage(task, target ?? firstStageOfCategory(workflow, input.status), workflow));
    }
  }

  if (task.startDate && task.dueDate && task.dueDate < task.startDate) {
    throw AppError.badRequest('Due date cannot be before the start date');
  }

  if (events.length) {
    await task.save();
    await recordActivity(ownerId, task, events);
  }
  return task;
}

/** Drag-and-drop endpoint: move to an exact stage (pipeline) or to a status column (kanban). */
export async function moveTask(ownerId, taskId, { stageId, status }) {
  const task = await getOwnedTask(ownerId, taskId);
  const workflow = await getOrCreateWorkflow(ownerId);

  let target;
  if (stageId) target = findStage(workflow, stageId);
  else if (task.status === status) return task; // already in that column
  else target = firstStageOfCategory(workflow, status);

  const events = moveTaskToStage(task, target, workflow);
  if (events.length) {
    await task.save();
    await recordActivity(ownerId, task, events);
  }
  return task;
}

export async function completeTask(ownerId, taskId) {
  return moveTask(ownerId, taskId, { status: 'done' });
}

export async function duplicateTask(ownerId, taskId) {
  const source = await getOwnedTask(ownerId, taskId);
  const workflow = await getOrCreateWorkflow(ownerId);
  // The copy restarts in the first open stage — duplicating a finished task gives you a fresh one.
  const stage = source.status === 'done' ? workflow.stages[0] : workflow.stages.id(source.stage) ?? workflow.stages[0];
  return createTask(
    ownerId,
    {
      title: `${source.title} (copy)`.slice(0, 140),
      description: source.description,
      priority: source.priority,
      stageId: stage._id.toString(),
      startDate: source.startDate,
      dueDate: source.dueDate,
      estimatedHours: source.estimatedHours,
      slaHours: source.slaHours,
      tags: source.tags,
      assignee: source.assignee,
    },
    { activityType: 'duplicated', changes: [{ field: 'source', from: null, to: source.title }] },
  );
}

export async function deleteTask(ownerId, taskId) {
  const task = await getOwnedTask(ownerId, taskId);
  await task.deleteOne();
  // Keep the task's history (useful audit trail) and add a final "deleted" entry for the feed.
  await recordActivity(ownerId, task, { type: 'deleted' });
}

export async function bulkUpdate(ownerId, { ids, stageId, status, priority }) {
  const tasks = await Task.find({ _id: { $in: ids }, owner: ownerId });
  const workflow = stageId || status ? await getOrCreateWorkflow(ownerId) : null;
  const target = stageId ? findStage(workflow, stageId) : null;

  let updated = 0;
  for (const task of tasks) {
    const events = [];
    if (priority && task.priority !== priority) {
      events.push({ type: 'priority_changed', changes: [{ field: 'priority', from: task.priority, to: priority }] });
      task.priority = priority;
    }
    if (target) events.push(...moveTaskToStage(task, target, workflow));
    else if (status && task.status !== status) events.push(...moveTaskToStage(task, firstStageOfCategory(workflow, status), workflow));

    if (events.length) {
      await task.save();
      await recordActivity(ownerId, task, events);
      updated += 1;
    }
  }
  return { matched: tasks.length, updated };
}

export async function bulkDelete(ownerId, ids) {
  const tasks = await Task.find({ _id: { $in: ids }, owner: ownerId }).select('_id title');
  if (!tasks.length) return { deleted: 0 };
  await Task.deleteMany({ _id: { $in: tasks.map((t) => t._id) }, owner: ownerId });
  await Activity.insertMany(tasks.map((t) => ({ owner: ownerId, task: t._id, taskTitle: t.title, type: 'deleted' })));
  return { deleted: tasks.length };
}
