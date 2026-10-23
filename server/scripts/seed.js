/*
 * Fills accounts with a realistic workspace: a custom workflow, ~100 tasks spread over the last
 * 30 days, back-dated stage history (including rework), and a full activity feed.
 *
 *   npm run seed                              → (re)creates the demo account demo@flowboard.dev
 *   npm run seed -- --email you@example.com   → also fills an existing account (repeatable)
 *   npm run seed -- --all                     → fills every existing account
 *
 * Re-running is safe: each targeted account's tasks, activity and workflow are replaced, so data
 * never duplicates. Other accounts are untouched. Passwords of non-demo accounts are never changed.
 * Refuses to run when NODE_ENV=production. The demo password is for local development only.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Activity } from '../src/models/Activity.js';
import { Task } from '../src/models/Task.js';
import { User } from '../src/models/User.js';
import { Workflow } from '../src/models/Workflow.js';
import { HOUR_MS } from '../src/utils/constants.js';
import { applyDerivedFields } from '../src/utils/sla.js';

const DEMO_EMAIL = 'demo@flowboard.dev';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo@12345';

if (env.isProduction) {
  console.error('Refusing to seed demo data with NODE_ENV=production.');
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Deterministic randomness: the same account always gets the same data set.
let state = 42;
const rand = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + rand() * (max - min);
const chance = (p) => rand() < p;

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * HOUR_MS);

// Workflow with one custom stage (QA) to show that stages are configurable.
const WORKFLOW_STAGES = [
  { name: 'Backlog', category: 'todo', color: '#A09B8F' },
  { name: 'To Do', category: 'todo', color: '#5B6B8C' },
  { name: 'In Progress', category: 'in_progress', color: '#B7791F' },
  { name: 'In Review', category: 'in_progress', color: '#6E5B9B' },
  { name: 'QA', category: 'in_progress', color: '#4F7C8A' },
  { name: 'Done', category: 'done', color: '#3F7A57' },
];

const PEOPLE = ['Aarav Mehta', 'Priya Nair', 'Sam Okafor', 'Meera Iyer', 'Lena Fischer', 'Jordan Lee', 'Kabir Shah', 'Ana Souza'];

// ---------------------------------------------------------------------------------------------
// Hand-written tasks that guarantee every interesting state is visible.
// path: [stageName, hoursSpent] ... the last entry is the current stage (its hours are ignored).
const CURATED = [
  { title: 'Fix checkout payment failure on Safari', priority: 'urgent', tags: ['bug', 'payments'], slaHours: 4, created: 6, due: -2, path: [['To Do', 1], ['In Progress']], assignee: 'Jordan Lee', description: 'Customers on Safari 17 see a blank screen after 3-D Secure. Reproduce, patch and add a regression test.' },
  { title: 'Production API latency spike investigation', priority: 'urgent', tags: ['incident', 'backend'], slaHours: 8, created: 6.6, due: 4, path: [['To Do', 0.5], ['In Progress']], assignee: 'Aarav Mehta', description: 'p95 latency doubled after the last deploy. Check slow queries and the new caching layer.' },
  { title: 'Security patch for session handling', priority: 'high', tags: ['security'], slaHours: 24, created: 30, due: -6, path: [['Backlog', 6], ['To Do', 10], ['In Progress']], assignee: 'Priya Nair', description: 'Rotate signing keys and shorten session lifetime per the audit report.' },
  { title: 'Prepare Q4 product roadmap deck', priority: 'high', tags: ['planning'], slaHours: 48, created: 20, due: 0.5, path: [['To Do', 4], ['In Progress']], assignee: 'Jordan Lee', description: 'Summarise themes, bets and success metrics for leadership review.' },
  { title: 'Review onboarding email sequence', priority: 'medium', tags: ['marketing'], slaHours: 24, created: 19, due: 3, path: [['To Do', 2], ['In Progress', 9], ['In Review']], assignee: 'Lena Fischer', description: 'Check tone, links and timing of the five-email welcome series.' },
  { title: 'Migrate image uploads to S3 presigned URLs', priority: 'high', tags: ['backend', 'infra'], slaHours: 72, created: 70, due: 30, path: [['Backlog', 20], ['To Do', 12], ['In Progress', 22], ['In Review']], assignee: 'Sam Okafor', description: 'Remove uploads from the API servers; the browser uploads straight to S3 with a short-lived signed URL.' },
  { title: 'Verify invoice totals after tax change', priority: 'high', tags: ['billing', 'qa'], slaHours: 24, created: 26, due: 8, path: [['To Do', 3], ['In Progress', 10], ['In Review', 4], ['QA']], assignee: 'Ana Souza', description: 'Spot-check 50 invoices across regions after the GST rate update.' },
  { title: 'Customer interview synthesis', priority: 'medium', tags: ['research'], slaHours: 72, created: 120, due: -24, path: [['To Do', 30], ['In Progress', 40], ['Done']], assignee: 'Meera Iyer', description: 'Cluster findings from 12 interviews into opportunity areas.' },
  { title: 'Accessibility audit of dashboard', priority: 'high', tags: ['a11y', 'frontend'], slaHours: 48, created: 96, due: -30, path: [['To Do', 8], ['In Progress', 20], ['In Review', 6], ['Done']], assignee: 'Lena Fischer', description: 'Keyboard paths, focus order, contrast and screen-reader labels on every dashboard widget.' },
  { title: 'Hotfix: CSV export drops unicode names', priority: 'urgent', tags: ['bug'], slaHours: 4, created: 50, due: -40, path: [['To Do', 1], ['In Progress', 6], ['Done']], assignee: 'Aarav Mehta', description: 'Took longer than the SLA because the root cause was in the encoding library.' },
  { title: 'Set up error monitoring alerts', priority: 'medium', tags: ['infra'], slaHours: 24, created: 26, due: 8, path: [['Backlog']], assignee: null, description: 'Page on-call when the error rate exceeds 2% for five minutes.' },
  { title: 'Design empty states for reports page', priority: 'low', tags: ['design'], slaHours: null, created: 10, due: 0.2, path: [['To Do']], assignee: 'Kabir Shah', description: 'Explain what each report shows and how to get the first data in.' },
  { title: 'Renew SSL certificates for staging', priority: 'high', tags: ['infra'], slaHours: 24, created: 2, due: 0.7, path: [['To Do']], assignee: 'Sam Okafor', description: 'Certificates expire this week; automate renewal while we are at it.' },
  { title: 'Write release notes for v2.4', priority: 'medium', tags: ['docs'], slaHours: 24, created: 40, due: -10, path: [['To Do', 6], ['In Progress', 8], ['Done']], assignee: 'Meera Iyer', description: 'Highlights, fixes and upgrade notes for customers.' },
  { title: 'Fix flaky login test after rework', priority: 'high', tags: ['bug', 'qa'], slaHours: 48, created: 60, due: 12, path: [['To Do', 4], ['In Progress', 10], ['Done', 6], ['In Progress']], assignee: 'Ana Souza', description: 'Marked done too early — the test still fails on CI about one run in ten. Reopened.' },
  { title: 'Plan team offsite agenda', priority: 'low', tags: ['team'], slaHours: null, created: 200, due: 72, path: [['Backlog']], assignee: 'Priya Nair', description: 'Two days: roadmap retro, hack day, and a long lunch.' },
];

// ---------------------------------------------------------------------------------------------
// Generated tasks: realistic titles grouped by area, each with its own description.
const AREAS = {
  frontend: {
    tags: ['frontend'],
    titles: ['Add dark mode to settings', 'Improve mobile navigation', 'Add keyboard shortcuts', 'Reduce bundle size of admin app', 'Polish onboarding checklist', 'Redesign notifications panel', 'Fix layout shift on pricing page', 'Add bulk edit to task table', 'Virtualise long activity lists', 'Inline editing for due dates'],
    blurb: 'Ship behind a feature flag and check it on mobile, tablet and desktop before rollout.',
  },
  backend: {
    tags: ['backend'],
    titles: ['Refactor notification service', 'Optimise dashboard queries', 'Add CSV import for tasks', 'Archive old projects automatically', 'Add webhooks for task events', 'Rate-limit public API keys', 'Paginate audit log endpoint', 'Cache workspace settings', 'Background job for weekly digests', 'Idempotency keys for payments API'],
    blurb: 'Keep the change backwards compatible and add tests for the new code paths.',
  },
  infra: {
    tags: ['infra'],
    titles: ['Upgrade Node.js runtime', 'Benchmark new database tier', 'Move logs to structured JSON', 'Add read replica for reports', 'Automate staging database refresh', 'Tighten IAM roles for CI', 'Set up uptime checks per region', 'Document deployment runbook'],
    blurb: 'Plan a maintenance window if anything needs downtime and write down the rollback steps.',
  },
  design: {
    tags: ['design'],
    titles: ['Redesign invoice PDF', 'Icon audit across the app', 'New illustrations for empty states', 'Design system: table density tokens', 'Refresh marketing site hero', 'Prototype pipeline analytics view'],
    blurb: 'Share a Figma link in the description once there is a first pass to review.',
  },
  growth: {
    tags: ['growth'],
    titles: ['A/B test new landing headline', 'Localise pricing page for India', 'Weekly metrics report automation', 'Referral programme landing page', 'Improve trial-to-paid email', 'Create sales demo environment'],
    blurb: 'Define the success metric up front and check results after two full weeks.',
  },
  bug: {
    tags: ['bug'],
    titles: ['Fix timezone bug in reminders', 'Investigate flaky e2e tests', 'Duplicate toasts after reconnect', 'Search ignores accented characters', 'Avatar upload fails over 2 MB', 'Sorting by due date puts blanks first', 'Session expires during long uploads', 'Broken link in password reset email'],
    blurb: 'Write down the reproduction steps first, then add a regression test with the fix.',
  },
  docs: {
    tags: ['docs'],
    titles: ['Create API rate limit docs', 'Update privacy policy page', 'Write migration guide for v3', 'Document SLA calculation for support', 'Record onboarding walkthrough video'],
    blurb: 'Keep it short, link to the relevant settings, and ask support to review the draft.',
  },
  research: {
    tags: ['research'],
    titles: ['Review support ticket backlog', 'Competitor pricing teardown', 'Interview five churned customers', 'Survey power users about views'],
    blurb: 'Summarise findings in three bullets and link the raw notes.',
  },
};
const EXTRA_TAGS = ['customer', 'q4', 'quick-win', 'tech-debt', 'enterprise', 'mobile'];

// Weighted paths: plenty of done work for trends, a healthy amount in flight, some rework.
const PATHS = [
  [3, [['Backlog']]],
  [4, [['To Do']]],
  [2, [['Backlog', 30], ['To Do']]],
  [5, [['To Do', 10], ['In Progress']]],
  [3, [['To Do', 12], ['In Progress', 20], ['In Review']]],
  [2, [['To Do', 8], ['In Progress', 18], ['In Review', 6], ['QA']]],
  [6, [['To Do', 8], ['In Progress', 16], ['Done']]],
  [5, [['To Do', 4], ['In Progress', 10], ['In Review', 5], ['Done']]],
  [4, [['Backlog', 24], ['To Do', 20], ['In Progress', 30], ['In Review', 8], ['QA', 6], ['Done']]],
  [1, [['To Do', 6], ['In Progress', 12], ['In Review', 4], ['In Progress', 8], ['In Review', 3], ['Done']]],
];
const weightedPath = () => {
  const total = PATHS.reduce((s, [w]) => s + w, 0);
  let r = rand() * total;
  for (const [w, path] of PATHS) if ((r -= w) < 0) return path;
  return PATHS[0][1];
};

const SLA_STEPS = [4, 8, 12, 24, 48, 72, 96, 120, 168, 240, 336, 504];
const nearestSla = (hours) => SLA_STEPS.reduce((best, h) => (Math.abs(h - hours) < Math.abs(best - hours) ? h : best));

function generatedSpecs() {
  const specs = [];
  for (const area of Object.values(AREAS)) {
    for (const title of area.titles) {
      // Jitter every stage duration so averages look natural.
      const path = weightedPath().map(([name, h]) => (h ? [name, Math.max(0.5, h * between(0.4, 1.8))] : [name]));
      const lead = path.slice(0, -1).reduce((s, [, h]) => s + h, 0);
      const isDone = path[path.length - 1][0] === 'Done';
      // Done work finishes mostly within the last 14 days so the trend chart has a steady signal.
      const tail = isDone ? (chance(0.8) ? between(1, 13 * 24) : between(14 * 24, 28 * 24)) : chance(0.45) ? between(1, 96) : between(96, 20 * 24);
      const created = Math.min(lead + tail + 1, 30 * 24);
      const factor = isDone ? pick([1.3, 1.6, 2, 2.5, 0.7]) : pick([3, 2.2, 1.6, 1.2, 0.8]);
      const tags = [...new Set([...area.tags, ...(chance(0.4) ? [pick(EXTRA_TAGS)] : [])])];
      specs.push({
        title,
        priority: pick(['low', 'medium', 'medium', 'medium', 'high', 'high', 'urgent']),
        tags,
        slaHours: chance(0.88) ? nearestSla((isDone ? lead : created) * factor) : null,
        created,
        due: chance(0.8) ? Math.round(between(-120, 14 * 24)) : null,
        path,
        assignee: chance(0.85) ? pick(PEOPLE) : null,
        description: `${title}. ${area.blurb}`,
        estimate: chance(0.75) ? pick([1, 2, 3, 4, 6, 8, 12, 16]) : null,
      });
    }
  }
  return specs;
}

// ---------------------------------------------------------------------------------------------

function buildTask(spec, owner, stagesByName) {
  const createdAt = hoursAgo(spec.created);
  const history = [];
  const activities = [{ type: 'created', at: createdAt }];
  let cursor = createdAt.getTime();

  spec.path.forEach(([stageName, hours], index) => {
    const stage = stagesByName.get(stageName);
    const isLast = index === spec.path.length - 1;
    const enteredAt = new Date(cursor);
    const exitedAt = isLast ? null : new Date(Math.min(cursor + hours * HOUR_MS, now - 60_000));
    history.push({ stage: stage._id, stageName: stage.name, enteredAt, exitedAt });

    if (index > 0) {
      const prev = stagesByName.get(spec.path[index - 1][0]);
      activities.push({
        type: 'status_changed',
        at: enteredAt,
        changes: [{ field: 'stage', from: prev.name, to: stage.name }, ...(prev.category !== stage.category ? [{ field: 'status', from: prev.category, to: stage.category }] : [])],
      });
      if (stage.category === 'done' && prev.category !== 'done') activities.push({ type: 'completed', at: enteredAt });
      if (prev.category === 'done' && stage.category !== 'done') activities.push({ type: 'reopened', at: enteredAt });
    }
    if (exitedAt) cursor = exitedAt.getTime();
  });

  const current = history[history.length - 1];
  const stage = stagesByName.get(current.stageName);
  const isDone = stage.category === 'done';
  const dueDate = spec.due === null || spec.due === undefined ? null : new Date(now + spec.due * HOUR_MS);
  const lifeMs = Math.max(HOUR_MS, current.enteredAt.getTime() - createdAt.getTime());
  const sometimeDuring = () => new Date(createdAt.getTime() + between(0.1, 0.9) * lifeMs);

  // Extra, realistic edits sprinkled through each task's life.
  if (spec.priority === 'urgent' && spec.created > 3) {
    activities.push({ type: 'priority_changed', at: new Date(createdAt.getTime() + HOUR_MS), changes: [{ field: 'priority', from: 'high', to: 'urgent' }] });
  } else if (chance(0.15)) {
    activities.push({ type: 'priority_changed', at: sometimeDuring(), changes: [{ field: 'priority', from: pick(['low', 'medium']), to: spec.priority }] });
  }
  if (dueDate && chance(0.3)) {
    activities.push({ type: 'due_date_changed', at: sometimeDuring(), changes: [{ field: 'dueDate', from: new Date(dueDate.getTime() - between(24, 96) * HOUR_MS), to: dueDate }] });
  }
  if (chance(0.35)) {
    const field = pick(['description', 'tags', 'assignee', 'estimatedHours']);
    const change =
      field === 'tags' ? { field, from: spec.tags.slice(0, 1), to: spec.tags }
        : field === 'assignee' ? { field, from: null, to: spec.assignee ?? 'Priya Nair' }
          : field === 'estimatedHours' ? { field, from: 2, to: spec.estimate ?? 4 }
            : { field, from: null, to: null };
    activities.push({ type: 'updated', at: sometimeDuring(), changes: [change] });
  }

  const startDate = history.length > 1 ? history[1].enteredAt : null;

  const task = applyDerivedFields({
    _id: new mongoose.Types.ObjectId(),
    owner,
    title: spec.title,
    description: spec.description ?? '',
    priority: spec.priority,
    stage: stage._id,
    status: stage.category,
    stageEnteredAt: current.enteredAt,
    stageHistory: history,
    startDate,
    dueDate,
    completedAt: isDone ? current.enteredAt : null,
    estimatedHours: spec.estimate ?? (spec.slaHours ? Math.max(1, Math.round(spec.slaHours * 0.4)) : null),
    slaHours: spec.slaHours ?? null,
    tags: spec.tags ?? [],
    assignee: spec.assignee === undefined ? pick(PEOPLE) : spec.assignee,
    createdAt,
    updatedAt: activities.reduce((latest, a) => (a.at > latest ? a.at : latest), createdAt),
  });

  return {
    task,
    activities: activities.map((a) => ({ owner, task: task._id, taskTitle: task.title, type: a.type, changes: a.changes ?? [], createdAt: a.at })),
  };
}

/** A few tasks that were created and later deleted — they only live on in the activity feed. */
function deletedTaskEvents(owner) {
  return [
    ['Old landing page experiment', 52],
    ['Duplicate: fix login redirect', 30],
    ['Test task please ignore', 9],
  ].flatMap(([title, ago]) => {
    const task = new mongoose.Types.ObjectId();
    return [
      { owner, task, taskTitle: title, type: 'created', changes: [], createdAt: hoursAgo(ago + between(20, 60)) },
      { owner, task, taskTitle: title, type: 'deleted', changes: [], createdAt: hoursAgo(ago) },
    ];
  });
}

async function fillAccount(user) {
  state = 42; // same data set for every account
  await Promise.all([Task.deleteMany({ owner: user._id }), Activity.deleteMany({ owner: user._id }), Workflow.deleteOne({ owner: user._id })]);

  const workflow = await Workflow.create({ owner: user._id, stages: WORKFLOW_STAGES });
  const stagesByName = new Map(workflow.stages.map((s) => [s.name, s]));

  const built = [...CURATED, ...generatedSpecs()].map((spec) => buildTask(spec, user._id, stagesByName));
  // Raw inserts so createdAt/updatedAt can be back-dated (Mongoose timestamps would overwrite them).
  await Task.collection.insertMany(built.map((b) => b.task));
  await Activity.collection.insertMany([...built.flatMap((b) => b.activities), ...deletedTaskEvents(user._id)]);

  const counts = built.reduce((acc, { task }) => ({ ...acc, [task.status]: (acc[task.status] ?? 0) + 1 }), {});
  const activityCount = built.reduce((n, b) => n + b.activities.length, 0) + 6;
  console.log(`  ${user.email}: ${built.length} tasks`, counts, `· ${activityCount} activity events`);
}

function parseArgs(argv) {
  const emails = [];
  let all = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--all') all = true;
    else if (argv[i] === '--email' && argv[i + 1]) emails.push(argv[(i += 1)].toLowerCase());
  }
  return { emails, all };
}

async function seed() {
  const { emails, all } = parseArgs(process.argv.slice(2));
  await connectDatabase();
  console.log(`Seeding ${env.MONGO_URI}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);
  const demo = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    { $set: { name: 'Demo User', passwordHash }, $inc: { sessionVersion: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const targets = [demo];
  if (all) targets.push(...(await User.find({ email: { $ne: DEMO_EMAIL } })));
  for (const email of emails) {
    if (email === DEMO_EMAIL || targets.some((u) => u.email === email)) continue;
    const user = await User.findOne({ email });
    if (user) targets.push(user);
    else console.warn(`  No account for ${email} — register it in the app first, then re-run.`);
  }

  for (const user of targets) await fillAccount(user);
  await Promise.all([Task.syncIndexes(), Activity.syncIndexes()]);

  console.log('\nDemo login (local development only):');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log('  password: the SEED_DEMO_PASSWORD value from server/.env (default "Demo@12345")');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
