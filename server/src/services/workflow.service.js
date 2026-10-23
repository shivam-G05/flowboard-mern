import { Task } from '../models/Task.js';
import { Workflow } from '../models/Workflow.js';
import { AppError } from '../utils/AppError.js';
import { DEFAULT_STAGES, MAX_STAGES, STATUSES } from '../utils/constants.js';
import { moveTaskToStage, syncStatusWithCategory } from './taskTransitions.js';
import { recordActivity } from './activity.service.js';

/** Every user has exactly one workflow; it is created with sensible default stages on first use. */
export async function getOrCreateWorkflow(ownerId) {
  const existing = await Workflow.findOne({ owner: ownerId });
  if (existing) return existing;
  try {
    return await Workflow.create({ owner: ownerId, stages: DEFAULT_STAGES });
  } catch (err) {
    // Two parallel first requests can race; the unique index on owner makes the loser re-read.
    if (err?.code === 11000) return Workflow.findOne({ owner: ownerId });
    throw err;
  }
}

export function findStage(workflow, stageId) {
  const stage = workflow.stages.id(stageId);
  if (!stage) throw AppError.badRequest('That stage does not exist in your workflow');
  return stage;
}

export function firstStageOfCategory(workflow, category) {
  const stage = workflow.stages.find((s) => s.category === category);
  if (!stage) throw AppError.badRequest(`Your workflow has no stage for "${category}"`);
  return stage;
}

function assertEveryCategoryCovered(stages) {
  for (const category of STATUSES) {
    if (!stages.some((s) => s.category === category)) {
      const label = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[category];
      throw AppError.conflict(`Your workflow needs at least one "${label}" stage`);
    }
  }
}

export async function addStage(ownerId, { name, category, color, position }) {
  const workflow = await getOrCreateWorkflow(ownerId);
  if (workflow.stages.length >= MAX_STAGES) throw AppError.conflict(`A workflow can have at most ${MAX_STAGES} stages`);
  if (workflow.stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    throw AppError.conflict(`A stage named "${name}" already exists`);
  }

  const firstDone = workflow.stages.findIndex((s) => s.category === 'done');
  const index = position ?? (firstDone === -1 ? workflow.stages.length : firstDone);
  workflow.stages.splice(Math.min(index, workflow.stages.length), 0, { name, category, color });
  await workflow.save();
  return workflow;
}

export async function updateStage(ownerId, stageId, changes) {
  const workflow = await getOrCreateWorkflow(ownerId);
  const stage = findStage(workflow, stageId);

  if (changes.name && workflow.stages.some((s) => !s._id.equals(stage._id) && s.name.toLowerCase() === changes.name.toLowerCase())) {
    throw AppError.conflict(`A stage named "${changes.name}" already exists`);
  }

  const categoryChanged = changes.category && changes.category !== stage.category;
  Object.assign(stage, changes);
  if (categoryChanged) assertEveryCategoryCovered(workflow.stages);
  await workflow.save();

  // Tasks in this stage inherit the new category (e.g. a stage re-classified as "done" completes them).
  if (categoryChanged) {
    const tasks = await Task.find({ owner: ownerId, stage: stage._id });
    const now = new Date();
    for (const task of tasks) {
      const events = syncStatusWithCategory(task, stage.category, now);
      await task.save();
      await recordActivity(ownerId, task, events);
    }
  }
  return workflow;
}

export async function reorderStages(ownerId, stageIds) {
  const workflow = await getOrCreateWorkflow(ownerId);
  const current = workflow.stages.map((s) => s._id.toString());
  const sameSet = stageIds.length === current.length && stageIds.every((id) => current.includes(id));
  if (!sameSet || new Set(stageIds).size !== stageIds.length) {
    throw AppError.badRequest('stageIds must list every existing stage exactly once');
  }
  const byId = new Map(workflow.stages.map((s) => [s._id.toString(), s.toObject()]));
  workflow.stages = stageIds.map((id) => byId.get(id));
  await workflow.save();
  return workflow;
}

/**
 * Deletes a stage. If tasks are still in it, the caller must say where they go (moveTo);
 * otherwise we refuse with 409 and report how many tasks would be affected. Tasks are never lost.
 */
export async function deleteStage(ownerId, stageId, moveTo) {
  const workflow = await getOrCreateWorkflow(ownerId);
  const stage = findStage(workflow, stageId);
  const remaining = workflow.stages.filter((s) => !s._id.equals(stage._id));
  assertEveryCategoryCovered(remaining);

  const taskCount = await Task.countDocuments({ owner: ownerId, stage: stage._id });
  let moved = 0;

  if (taskCount > 0) {
    if (!moveTo) {
      throw AppError.conflict(`"${stage.name}" still has ${taskCount} task(s). Choose a stage to move them to.`, {
        taskCount,
        requiresMigration: true,
      });
    }
    if (moveTo === stageId) throw AppError.badRequest('Choose a different stage to move the tasks to');
    const target = findStage(workflow, moveTo);

    const tasks = await Task.find({ owner: ownerId, stage: stage._id });
    const now = new Date();
    for (const task of tasks) {
      const events = moveTaskToStage(task, target, workflow, now);
      await task.save();
      await recordActivity(ownerId, task, events);
      moved += 1;
    }
  }

  workflow.stages = remaining;
  await workflow.save();
  return { workflow, moved };
}
