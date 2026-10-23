import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createUserAgent, setupDatabase, teardownDatabase } from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('workflow stages', () => {
  it('creates default stages for a new user', async () => {
    const { agent } = await createUserAgent();
    const res = await agent.get('/api/workflow');
    assert.deepEqual(
      res.body.data.stages.map((s) => s.name),
      ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    );
  });

  it('adds, renames and reorders stages', async () => {
    const { agent } = await createUserAgent();
    const added = await agent.post('/api/workflow/stages').send({ name: 'QA', category: 'in_progress', color: '#0ea5e9' });
    assert.equal(added.status, 201);
    // New stages are inserted before the first "done" stage by default.
    const names = added.body.data.stages.map((s) => s.name);
    assert.equal(names.indexOf('QA'), names.indexOf('Done') - 1);

    const qa = added.body.data.stages.find((s) => s.name === 'QA');
    const renamed = await agent.patch(`/api/workflow/stages/${qa._id}`).send({ name: 'Quality Check' });
    assert.ok(renamed.body.data.stages.some((s) => s.name === 'Quality Check'));

    const dup = await agent.post('/api/workflow/stages').send({ name: 'quality check', category: 'todo' });
    assert.equal(dup.status, 409);

    const reversed = renamed.body.data.stages.map((s) => s._id).reverse();
    const reordered = await agent.put('/api/workflow/stages/order').send({ stageIds: reversed });
    assert.deepEqual(reordered.body.data.stages.map((s) => s._id), reversed);

    const partial = await agent.put('/api/workflow/stages/order').send({ stageIds: reversed.slice(1) });
    assert.equal(partial.status, 400);
  });

  it('refuses to delete a stage with tasks unless a destination is given, then migrates them', async () => {
    const { agent } = await createUserAgent();
    const stages = (await agent.get('/api/workflow')).body.data.stages;
    const review = stages.find((s) => s.name === 'In Review');
    const done = stages.find((s) => s.name === 'Done');

    const task = (await agent.post('/api/tasks').send({ title: 'In review', stageId: review._id })).body.data;

    const blocked = await agent.delete(`/api/workflow/stages/${review._id}`);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.details.taskCount, 1);

    const migrated = await agent.delete(`/api/workflow/stages/${review._id}?moveTo=${done._id}`);
    assert.equal(migrated.status, 200);
    assert.equal(migrated.body.meta.movedTasks, 1);
    assert.ok(!migrated.body.data.stages.some((s) => s._id === review._id));

    const after = (await agent.get(`/api/tasks/${task._id}`)).body.data;
    assert.equal(after.stage, done._id);
    assert.equal(after.status, 'done');
    assert.ok(after.completedAt);
  });

  it('keeps at least one stage per status category', async () => {
    const { agent } = await createUserAgent();
    const done = (await agent.get('/api/workflow')).body.data.stages.find((s) => s.category === 'done');
    const res = await agent.delete(`/api/workflow/stages/${done._id}`);
    assert.equal(res.status, 409);
  });

  it('updates task statuses when a stage changes category', async () => {
    const { agent } = await createUserAgent();
    const review = (await agent.get('/api/workflow')).body.data.stages.find((s) => s.name === 'In Review');
    const task = (await agent.post('/api/tasks').send({ title: 'Reviewed', stageId: review._id })).body.data;
    assert.equal(task.status, 'in_progress');

    await agent.patch(`/api/workflow/stages/${review._id}`).send({ category: 'done' });
    const after = (await agent.get(`/api/tasks/${task._id}`)).body.data;
    assert.equal(after.status, 'done');
  });

  it('isolates workflows per user', async () => {
    const alice = await createUserAgent();
    const bob = await createUserAgent();
    const aliceStage = (await alice.agent.get('/api/workflow')).body.data.stages[0];

    const res = await bob.agent.patch(`/api/workflow/stages/${aliceStage._id}`).send({ name: 'Hacked' });
    assert.equal(res.status, 400); // not a stage in Bob's workflow
    const aliceAfter = (await alice.agent.get('/api/workflow')).body.data.stages[0];
    assert.equal(aliceAfter.name, aliceStage.name);
  });

  it('reports per-stage statistics from real data', async () => {
    const { agent } = await createUserAgent();
    const stages = (await agent.get('/api/workflow')).body.data.stages;
    const t = (await agent.post('/api/tasks').send({ title: 'Stat me' })).body.data;
    await agent.patch(`/api/tasks/${t._id}/move`).send({ stageId: stages[2]._id });

    const stats = (await agent.get('/api/workflow/stats')).body.data;
    const backlog = stats.find((s) => s.name === 'Backlog');
    const inProgress = stats.find((s) => s.name === 'In Progress');
    assert.equal(backlog.count, 0);
    assert.equal(backlog.exits, 1);
    assert.equal(typeof backlog.avgDurationMs, 'number');
    assert.equal(inProgress.count, 1);
  });
});
