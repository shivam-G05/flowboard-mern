import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { Task } from '../src/models/Task.js';
import { HOUR_MS } from '../src/utils/constants.js';
import { applyDerivedFields, computeSla, isOverdue, stageDurations } from '../src/utils/sla.js';
import { createUserAgent, setupDatabase, teardownDatabase } from './helpers.js';

const now = new Date('2026-06-01T12:00:00Z');
const oid = (id) => new mongoose.Types.ObjectId(id);
const hoursAgo = (h) => new Date(now.getTime() - h * HOUR_MS);

describe('computeSla (pure)', () => {
  it('is on track before 75% of the window is used', () => {
    const sla = computeSla({ slaHours: 10, createdAt: hoursAgo(5), status: 'todo' }, now);
    assert.equal(sla.health, 'on_track');
    assert.equal(sla.percentUsed, 50);
    assert.equal(sla.remainingMs, 5 * HOUR_MS);
  });

  it('is at risk from 75% of the window', () => {
    assert.equal(computeSla({ slaHours: 10, createdAt: hoursAgo(7.5), status: 'in_progress' }, now).health, 'at_risk');
  });

  it('is breached once the window has passed', () => {
    const sla = computeSla({ slaHours: 4, createdAt: hoursAgo(6), status: 'todo' }, now);
    assert.equal(sla.health, 'breached');
    assert.equal(sla.remainingMs, -2 * HOUR_MS);
  });

  it('stops the clock at completion: met or breached', () => {
    const met = computeSla({ slaHours: 8, createdAt: hoursAgo(20), completedAt: hoursAgo(14), status: 'done' }, now);
    assert.equal(met.health, 'met');
    assert.equal(met.elapsedMs, 6 * HOUR_MS);

    const late = computeSla({ slaHours: 8, createdAt: hoursAgo(20), completedAt: hoursAgo(2), status: 'done' }, now);
    assert.equal(late.health, 'breached');
  });

  it('handles missing data safely', () => {
    assert.equal(computeSla({ status: 'todo', createdAt: hoursAgo(1) }, now).health, 'none');
    assert.equal(computeSla({ slaHours: 4, status: 'todo' }, now).health, 'none');
    // Done but completedAt missing: measured up to now, no crash
    assert.equal(computeSla({ slaHours: 4, createdAt: hoursAgo(1), status: 'done' }, now).health, 'met');
  });

  it('keeps overdue (due date) separate from SLA breach', () => {
    const task = { slaHours: 100, createdAt: hoursAgo(2), dueDate: hoursAgo(1), status: 'todo' };
    assert.equal(isOverdue(task, now), true);
    assert.equal(computeSla(task, now).health, 'on_track');
    assert.equal(isOverdue({ ...task, status: 'done' }, now), false);
  });

  it('pre-computes thresholds used by database filters', () => {
    const t = applyDerivedFields({ priority: 'urgent', slaHours: 8, createdAt: hoursAgo(0), status: 'todo' }, now);
    assert.equal(t.priorityRank, 4);
    assert.equal(t.slaDueAt.getTime() - now.getTime(), 8 * HOUR_MS);
    assert.equal(t.slaRiskAt.getTime() - now.getTime(), 6 * HOUR_MS);
    assert.equal(t.slaMet, null);
  });

  it('sums time spent per stage across visits, including the open one', () => {
    const history = [
      { stage: 'a', stageName: 'To Do', enteredAt: hoursAgo(10), exitedAt: hoursAgo(8) },
      { stage: 'b', stageName: 'Doing', enteredAt: hoursAgo(8), exitedAt: hoursAgo(5) },
      { stage: 'a', stageName: 'To Do', enteredAt: hoursAgo(5), exitedAt: hoursAgo(4) },
      { stage: 'b', stageName: 'Doing', enteredAt: hoursAgo(4), exitedAt: null },
      { stage: 'c' }, // incomplete entry is ignored
    ];
    const result = Object.fromEntries(stageDurations(history, now).map((d) => [d.stage, d]));
    assert.equal(result.a.durationMs, 3 * HOUR_MS);
    assert.equal(result.a.visits, 2);
    assert.equal(result.b.durationMs, 7 * HOUR_MS);
    assert.equal(result.c, undefined);
  });
});

describe('SLA health filters (database)', () => {
  before(setupDatabase);
  after(teardownDatabase);

  it('filters tasks by on_track / at_risk / breached / met', async () => {
    const { agent, user } = await createUserAgent();
    const stage = (await agent.get('/api/workflow')).body.data.stages[0];
    const doneStage = (await agent.get('/api/workflow')).body.data.stages.find((s) => s.category === 'done');
    const current = new Date();
    const ago = (h) => new Date(current.getTime() - h * HOUR_MS);

    const make = (title, createdAt, extra = {}) => {
      const doc = applyDerivedFields({
        owner: oid(user._id), title, priority: 'medium', stage: oid(stage._id), status: 'todo', slaHours: 10,
        createdAt, updatedAt: createdAt, stageEnteredAt: createdAt, dueDate: null, completedAt: null, ...extra,
      });
      return doc;
    };
    // Raw insert so createdAt can be back-dated.
    await Task.collection.insertMany([
      make('fresh', ago(1)),
      make('risky', ago(8)),
      make('late', ago(12)),
      make('met', ago(20), { status: 'done', stage: oid(doneStage._id), completedAt: ago(15) }),
      make('missed', ago(30), { status: 'done', stage: oid(doneStage._id), completedAt: ago(5) }),
    ]);

    const titles = async (sla) => (await agent.get(`/api/tasks?sla=${sla}`)).body.data.map((t) => t.title).sort();
    assert.deepEqual(await titles('on_track'), ['fresh']);
    assert.deepEqual(await titles('at_risk'), ['risky']);
    assert.deepEqual(await titles('breached'), ['late', 'missed']);
    assert.deepEqual(await titles('met'), ['met']);

    const summary = (await agent.get('/api/dashboard/summary')).body.data;
    assert.equal(summary.sla.breached, 2);
    assert.equal(summary.sla.atRisk, 1);
    assert.equal(summary.sla.met, 1);
    assert.equal(summary.sla.complianceRate, 33); // 1 met out of 3 resolved (met + 2 breached)
    assert.equal(summary.totals.total, 5);
    assert.equal(summary.totals.completed, 2);
  });
});
