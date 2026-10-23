import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Activity } from '../src/models/Activity.js';
import { Task } from '../src/models/Task.js';
import { createUserAgent, setupDatabase, teardownDatabase } from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('task CRUD', () => {
  it('creates a task in the first stage with SLA info and a "created" activity', async () => {
    const { agent } = await createUserAgent();
    const res = await agent.post('/api/tasks').send({ title: 'Write report', priority: 'high', slaHours: 24, tags: ['docs', 'docs'] });

    assert.equal(res.status, 201);
    const task = res.body.data;
    assert.equal(task.status, 'todo');
    assert.equal(task.sla.health, 'on_track');
    assert.deepEqual(task.tags, ['docs']);
    assert.equal(task.stageHistory.length, 1);

    const activity = await agent.get(`/api/tasks/${task._id}/activity`);
    assert.equal(activity.body.data[0].type, 'created');
  });

  it('validates input on the server', async () => {
    const { agent } = await createUserAgent();
    assert.equal((await agent.post('/api/tasks').send({ title: '' })).status, 400);
    assert.equal((await agent.post('/api/tasks').send({ title: 'x', priority: 'critical' })).status, 400);
    const badDates = await agent.post('/api/tasks').send({ title: 'x', startDate: '2026-05-10', dueDate: '2026-05-01' });
    assert.equal(badDates.status, 400);
    assert.equal((await agent.get('/api/tasks/not-an-id')).status, 400);
  });

  it('ignores fields the client is not allowed to set (mass assignment)', async () => {
    const { agent, user } = await createUserAgent();
    const other = await createUserAgent();
    const res = await agent.post('/api/tasks').send({
      title: 'Sneaky',
      owner: other.user._id,
      completedAt: '2020-01-01',
      slaMet: true,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.owner, user._id);
    assert.equal(res.body.data.completedAt, null);
  });

  it('records priority, due date and status changes in the activity log', async () => {
    const { agent } = await createUserAgent();
    const { body } = await agent.post('/api/tasks').send({ title: 'Ship it', priority: 'low' });
    const id = body.data._id;

    const updated = await agent.patch(`/api/tasks/${id}`).send({ priority: 'urgent', dueDate: '2030-01-01T00:00:00.000Z', title: 'Ship it now' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.priority, 'urgent');

    const done = await agent.post(`/api/tasks/${id}/complete`);
    assert.equal(done.body.data.status, 'done');
    assert.ok(done.body.data.completedAt);

    const types = (await agent.get(`/api/tasks/${id}/activity`)).body.data.map((a) => a.type);
    for (const t of ['created', 'updated', 'priority_changed', 'due_date_changed', 'status_changed', 'completed']) {
      assert.ok(types.includes(t), `missing ${t} in ${types}`);
    }
  });

  it('moves a task between stages and keeps stage history consistent', async () => {
    const { agent } = await createUserAgent();
    const workflow = (await agent.get('/api/workflow')).body.data;
    const inProgress = workflow.stages.find((s) => s.name === 'In Progress');
    const { body } = await agent.post('/api/tasks').send({ title: 'Drag me' });

    const moved = await agent.patch(`/api/tasks/${body.data._id}/move`).send({ stageId: inProgress._id });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.data.status, 'in_progress');

    // Kanban-style move by status picks the first stage of that category.
    const toDone = await agent.patch(`/api/tasks/${body.data._id}/move`).send({ status: 'done' });
    assert.equal(toDone.body.data.status, 'done');

    const detail = (await agent.get(`/api/tasks/${body.data._id}`)).body.data;
    assert.equal(detail.stageHistory.length, 3);
    assert.equal(detail.stageHistory.filter((v) => v.exitedAt === null).length, 1);
    assert.ok(detail.stageDurations.length >= 3);
  });

  it('duplicates and deletes a task', async () => {
    const { agent } = await createUserAgent();
    const { body } = await agent.post('/api/tasks').send({ title: 'Original', tags: ['a'] });
    const copy = await agent.post(`/api/tasks/${body.data._id}/duplicate`);
    assert.equal(copy.status, 201);
    assert.equal(copy.body.data.title, 'Original (copy)');

    assert.equal((await agent.delete(`/api/tasks/${body.data._id}`)).status, 200);
    assert.equal((await agent.get(`/api/tasks/${body.data._id}`)).status, 404);
  });

  it('bulk-updates status for selected tasks only', async () => {
    const { agent } = await createUserAgent();
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push((await agent.post('/api/tasks').send({ title: `Bulk ${i}` })).body.data._id);

    const res = await agent.patch('/api/tasks/bulk').send({ ids: ids.slice(0, 2), status: 'in_progress' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.updated, 2);

    const list = (await agent.get('/api/tasks?status=in_progress')).body;
    assert.equal(list.meta.pagination.total, 2);
  });
});

describe('authorization — users cannot touch each other\'s tasks', () => {
  it('returns 404 for read, update, move, delete and activity on another user\'s task', async () => {
    const alice = await createUserAgent();
    const mallory = await createUserAgent();
    const { body } = await alice.agent.post('/api/tasks').send({ title: 'Private' });
    const id = body.data._id;

    assert.equal((await mallory.agent.get(`/api/tasks/${id}`)).status, 404);
    assert.equal((await mallory.agent.patch(`/api/tasks/${id}`).send({ title: 'pwned' })).status, 404);
    assert.equal((await mallory.agent.patch(`/api/tasks/${id}/move`).send({ status: 'done' })).status, 404);
    assert.equal((await mallory.agent.delete(`/api/tasks/${id}`)).status, 404);
    assert.equal((await mallory.agent.get(`/api/tasks/${id}/activity`)).status, 404);

    const bulk = await mallory.agent.patch('/api/tasks/bulk').send({ ids: [id], status: 'done' });
    assert.equal(bulk.body.data.matched, 0);
    const bulkDelete = await mallory.agent.post('/api/tasks/bulk-delete').send({ ids: [id] });
    assert.equal(bulkDelete.body.data.deleted, 0);

    const malloryList = (await mallory.agent.get('/api/tasks')).body;
    assert.equal(malloryList.meta.pagination.total, 0);

    const stillThere = await Task.findById(id);
    assert.equal(stillThere.title, 'Private');
    assert.equal(stillThere.status, 'todo');
    assert.equal(await Activity.countDocuments({ owner: mallory.user._id }), 0);
  });
});

describe('listing: pagination, filtering, sorting', () => {
  let agent;

  before(async () => {
    ({ agent } = await createUserAgent());
    const priorities = ['low', 'medium', 'high', 'urgent'];
    for (let i = 0; i < 25; i += 1) {
      await agent.post('/api/tasks').send({
        title: `Task ${String(i).padStart(2, '0')}${i === 7 ? ' quarterly invoice' : ''}`,
        description: i === 12 ? 'Contains the word invoice' : '',
        priority: priorities[i % 4],
        dueDate: i < 5 ? new Date(Date.now() - 86400000).toISOString() : null, // 5 overdue
      });
    }
  });

  it('returns pagination metadata and the requested page only', async () => {
    const res = await agent.get('/api/tasks?page=2&limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 10);
    assert.deepEqual(res.body.meta.pagination, { total: 25, page: 2, limit: 10, totalPages: 3 });

    const last = await agent.get('/api/tasks?page=3&limit=10');
    assert.equal(last.body.data.length, 5);
  });

  it('searches title and description, case-insensitively, with regex characters escaped', async () => {
    const res = await agent.get('/api/tasks?search=INVOICE');
    assert.equal(res.body.meta.pagination.total, 2);
    const special = await agent.get(`/api/tasks?search=${encodeURIComponent('.*')}`);
    assert.equal(special.body.meta.pagination.total, 0);
  });

  it('filters by priority list and overdue state', async () => {
    const urgent = await agent.get('/api/tasks?priority=urgent,high&limit=50');
    assert.ok(urgent.body.data.every((t) => ['urgent', 'high'].includes(t.priority)));
    assert.equal(urgent.body.meta.pagination.total, 12);

    const overdue = await agent.get('/api/tasks?overdue=true');
    assert.equal(overdue.body.meta.pagination.total, 5);
    assert.ok(overdue.body.data.every((t) => t.isOverdue));
  });

  it('sorts by priority using the numeric rank, not alphabetically', async () => {
    const res = await agent.get('/api/tasks?sort=priority&order=desc&limit=25');
    const ranks = { low: 1, medium: 2, high: 3, urgent: 4 };
    const seq = res.body.data.map((t) => ranks[t.priority]);
    assert.deepEqual(seq, [...seq].sort((a, b) => b - a));
  });

  it('rejects unknown filter values', async () => {
    assert.equal((await agent.get('/api/tasks?priority=critical')).status, 400);
    assert.equal((await agent.get('/api/tasks?limit=10000')).status, 400);
  });
});
