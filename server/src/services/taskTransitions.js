import { MAX_STAGE_HISTORY } from '../utils/constants.js';

/*
 * The only two functions that change where a task sits in the workflow.
 * Both mutate the (unsaved) Mongoose document and return the activity events to record,
 * so the caller decides when to save. Keeping this in one place guarantees that
 * stage history, status, completedAt and SLA outcome always stay consistent.
 */

/** Applies a stage's category to the task: sets status and completedAt. */
export function syncStatusWithCategory(task, category, now = new Date()) {
  const previous = task.status;
  if (previous === category) return [];

  task.status = category;
  const events = [{ type: 'status_changed', changes: [{ field: 'status', from: previous, to: category }] }];

  if (category === 'done') {
    task.completedAt = now;
    events.push({ type: 'completed' });
  } else if (previous === 'done') {
    task.completedAt = null; // reopened: the SLA clock keeps running from creation
    events.push({ type: 'reopened' });
  }
  return events;
}

/** Moves a task into `target` stage, closing the open history entry and opening a new one. */
export function moveTaskToStage(task, target, workflow, now = new Date()) {
  if (task.stage?.equals?.(target._id)) return [];

  const fromStage = workflow.stages.id(task.stage);
  const openVisit = [...task.stageHistory].reverse().find((v) => !v.exitedAt);
  const fromName = fromStage?.name ?? openVisit?.stageName ?? 'Unknown stage';

  if (openVisit) openVisit.exitedAt = now;
  task.stageHistory.push({ stage: target._id, stageName: target.name, enteredAt: now, exitedAt: null });
  if (task.stageHistory.length > MAX_STAGE_HISTORY) {
    task.stageHistory.splice(0, task.stageHistory.length - MAX_STAGE_HISTORY);
  }

  task.stage = target._id;
  task.stageEnteredAt = now;

  const previousStatus = task.status;
  const statusEvents = syncStatusWithCategory(task, target.category, now);

  // One readable "Moved from X to Y" event, plus completed/reopened when the category changed.
  const moveEvent = {
    type: 'status_changed',
    changes: [
      { field: 'stage', from: fromName, to: target.name },
      ...(previousStatus !== target.category ? [{ field: 'status', from: previousStatus, to: target.category }] : []),
    ],
  };
  return [moveEvent, ...statusEvents.filter((e) => e.type !== 'status_changed')];
}
