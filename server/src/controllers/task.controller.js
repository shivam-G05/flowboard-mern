import { listTaskActivity } from '../services/activity.service.js';
import * as tasks from '../services/task.service.js';
import { created, ok, paginationMeta } from '../utils/respond.js';

// Controllers stay thin: read validated input, call a service, send the response.

export async function list(req, res) {
  const q = req.valid.query;
  const { items, total } = await tasks.listTasks(req.user.id, q);
  ok(res, items, paginationMeta({ total, page: q.page, limit: q.limit }));
}

export async function getOne(req, res) {
  ok(res, await tasks.getTaskDetail(req.user.id, req.valid.params.id));
}

export async function create(req, res) {
  const task = await tasks.createTask(req.user.id, req.valid.body);
  created(res, tasks.toTaskDTO(task));
}

export async function update(req, res) {
  const task = await tasks.updateTask(req.user.id, req.valid.params.id, req.valid.body);
  ok(res, tasks.toTaskDTO(task));
}

export async function move(req, res) {
  const task = await tasks.moveTask(req.user.id, req.valid.params.id, req.valid.body);
  ok(res, tasks.toTaskDTO(task));
}

export async function complete(req, res) {
  const task = await tasks.completeTask(req.user.id, req.valid.params.id);
  ok(res, tasks.toTaskDTO(task));
}

export async function duplicate(req, res) {
  const task = await tasks.duplicateTask(req.user.id, req.valid.params.id);
  created(res, tasks.toTaskDTO(task));
}

export async function remove(req, res) {
  await tasks.deleteTask(req.user.id, req.valid.params.id);
  ok(res, { deleted: true });
}

export async function bulkUpdate(req, res) {
  ok(res, await tasks.bulkUpdate(req.user.id, req.valid.body));
}

export async function bulkDelete(req, res) {
  ok(res, await tasks.bulkDelete(req.user.id, req.valid.body.ids));
}

export async function activity(req, res) {
  await tasks.getOwnedTask(req.user.id, req.valid.params.id); // ownership check
  ok(res, await listTaskActivity(req.user.id, req.valid.params.id));
}
