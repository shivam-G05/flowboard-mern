import { getStageStats } from '../services/analytics.service.js';
import * as workflows from '../services/workflow.service.js';
import { created, ok } from '../utils/respond.js';

export async function get(req, res) {
  ok(res, await workflows.getOrCreateWorkflow(req.user.id));
}

export async function addStage(req, res) {
  created(res, await workflows.addStage(req.user.id, req.valid.body));
}

export async function updateStage(req, res) {
  ok(res, await workflows.updateStage(req.user.id, req.valid.params.stageId, req.valid.body));
}

export async function reorderStages(req, res) {
  ok(res, await workflows.reorderStages(req.user.id, req.valid.body.stageIds));
}

export async function deleteStage(req, res) {
  const { workflow, moved } = await workflows.deleteStage(req.user.id, req.valid.params.stageId, req.valid.query.moveTo);
  ok(res, workflow, { movedTasks: moved });
}

export async function stats(req, res) {
  ok(res, await getStageStats(req.user.id));
}
