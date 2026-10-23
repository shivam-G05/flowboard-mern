import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Layers, Plus } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { ActivityTimeline } from '../features/tasks/ActivityTimeline.jsx';
import { useTaskList } from '../features/tasks/queries.js';
import { DueDate, PriorityIcon, SlaBadge } from '../features/tasks/TaskBadges.jsx';
import { useTaskUI } from '../features/tasks/TaskUIProvider.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { dashboardApi } from '../services/endpoints.js';
import { cn } from '../utils/cn.js';
import { PRIORITY } from '../utils/constants.js';
import { formatDuration } from '../utils/format.js';

// Recharts is the heaviest dependency; load it only when the dashboard renders its chart.
const TrendChart = lazy(() => import('../features/dashboard/DashboardCharts.jsx').then((m) => ({ default: m.TrendChart })));

const OVERDUE_PARAMS = { overdue: 'true', sort: 'dueDate', order: 'asc', page: 1, limit: 5 };

/** A number inside a sentence that links to the filtered list. */
function Figure({ to, value, tone }) {
  return (
    <Link to={to} className={cn('rounded-sm font-medium underline decoration-1 underline-offset-[5px] hover:decoration-2', tone ?? 'text-ink-900 decoration-ink-300')}>
      {value}
    </Link>
  );
}

function Summary({ data }) {
  const { totals, sla } = data;
  const clauses = [];
  if (totals.overdue) clauses.push(<><Figure to="/app/tasks?overdue=true" value={totals.overdue} tone="text-bad-600 decoration-bad-500/40" /> overdue</>);
  if (sla.atRisk) clauses.push(<><Figure to="/app/tasks?sla=at_risk" value={sla.atRisk} tone="text-warn-600 decoration-warn-500/40" /> close to breaching their SLA</>);
  if (totals.dueToday) clauses.push(<><Figure to="/app/tasks?sort=dueDate&order=asc" value={totals.dueToday} /> due today</>);
  return (
    <p className="mt-4 max-w-3xl text-[18px] leading-[1.55] text-ink-600">
      You have <Figure to="/app/tasks?status=todo,in_progress" value={`${totals.pending} open tasks`} />.{' '}
      {clauses.length ? (
        <>
          Of those,{' '}
          {clauses.map((c, i) => (
            <span key={i}>
              {c}
              {i < clauses.length - 2 ? ', ' : i === clauses.length - 2 ? ' and ' : '.'}
            </span>
          ))}
        </>
      ) : (
        'Nothing is overdue or at risk — a good day to pull from the backlog.'
      )}
    </p>
  );
}

/** The primary metric: SLA compliance, with the open/closed breakdown it comes from. */
function SlaPanel({ sla }) {
  const segments = [
    { key: 'onTrack', label: 'On track', value: sla.onTrack, color: 'bg-good-500', to: '/app/tasks?sla=on_track' },
    { key: 'atRisk', label: 'At risk', value: sla.atRisk, color: 'bg-warn-500', to: '/app/tasks?sla=at_risk' },
    { key: 'breached', label: 'Breached', value: sla.breached, color: 'bg-bad-500', to: '/app/tasks?sla=breached' },
    { key: 'met', label: 'Met', value: sla.met, color: 'bg-ink-800', to: '/app/tasks?sla=met' },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <p className="eyebrow">SLA compliance</p>
      <p className="mt-3 font-display text-[88px] leading-[0.9] tracking-[-0.02em] text-ink-900">
        {sla.complianceRate === null ? '—' : sla.complianceRate}
        {sla.complianceRate !== null && <span className="text-[44px] text-ink-400">%</span>}
      </p>
      <p className="mt-3 max-w-xs text-[13px] text-ink-500">Of {sla.met + sla.breached} tasks whose SLA outcome is known, this share was finished within its target.</p>

      {total > 0 && (
        <div className="mt-6 flex h-1.5 gap-px" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
          {segments.map((s) => s.value > 0 && <div key={s.key} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />)}
        </div>
      )}
      <ul className="mt-3 divide-y divide-ink-200 border-b border-ink-200">
        {segments.map((s) => (
          <li key={s.key}>
            <Link to={s.to} className="group flex items-center gap-2.5 py-2 text-[13px]">
              <span className={cn('h-2 w-2 rounded-[2px]', s.color)} aria-hidden />
              <span className="text-ink-700 group-hover:text-ink-900">{s.label}</span>
              <span className="ml-auto font-mono text-[12px] text-ink-900">{s.value}</span>
              <ArrowRight className="h-3.5 w-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Row of figures separated by rules — a strip, not a grid of cards. */
function FiguresStrip({ data }) {
  const items = [
    { label: 'Open', value: data.totals.pending, sub: `${data.totals.todo} not started`, to: '/app/tasks?status=todo,in_progress' },
    { label: 'In progress', value: data.totals.inProgress, sub: 'being worked on', to: '/app/tasks?status=in_progress' },
    { label: 'Completed', value: data.totals.completed, sub: `${data.completionRate}% of all tasks`, to: '/app/tasks?status=done' },
    { label: 'Done this week', value: data.totals.completedThisWeek, sub: 'last 7 days' },
    { label: 'Avg completion', value: formatDuration(data.avgCompletionMs), sub: 'creation → done' },
  ];
  return (
    <dl className="grid grid-cols-2 border-y border-ink-200 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, i) => {
        const body = (
          <>
            <dt className="eyebrow">{item.label}</dt>
            <dd className="mt-2 font-display text-[38px] leading-none text-ink-900">{item.value}</dd>
            <dd className="mt-1.5 font-mono text-[11px] text-ink-400">{item.sub}</dd>
          </>
        );
        const cls = cn('block py-5 pr-5 lg:px-5 lg:first:pl-0', i > 0 && 'lg:border-l lg:border-ink-200', item.to && 'transition-colors hover:bg-ink-900/[0.025]');
        return item.to ? (
          <Link key={item.label} to={item.to} className={cls}>
            {body}
          </Link>
        ) : (
          <div key={item.label} className={cls}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}

function TaskRow({ task }) {
  const ui = useTaskUI();
  return (
    <li>
      <button onClick={() => ui.openTask(task._id)} className="group grid w-full grid-cols-[16px_1fr_auto] items-center gap-3 py-2 text-left">
        <PriorityIcon priority={task.priority} />
        <span className="truncate text-[13.5px] text-ink-900 group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-2">{task.title}</span>
        <span className="flex items-center gap-3">
          <span className="hidden sm:inline-flex">
            <SlaBadge sla={task.sla} compact />
          </span>
          <DueDate value={task.dueDate} overdue={task.isOverdue} />
        </span>
      </button>
    </li>
  );
}

function TaskGroup({ title, tasks, empty, link }) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-ink-200 pb-2">
        <h3 className="text-[13px] font-semibold text-ink-900">
          {title} <span className="font-mono text-[11.5px] font-normal text-ink-400">{tasks.length}</span>
        </h3>
        {link}
      </div>
      {tasks.length ? <ul className="divide-y divide-ink-200/70">{tasks.map((t) => <TaskRow key={t._id} task={t} />)}</ul> : <p className="py-3 text-[13px] text-ink-400">{empty}</p>}
    </div>
  );
}

function StageTimes({ stages }) {
  const open = stages.filter((s) => s.category !== 'done');
  const max = Math.max(...open.map((s) => s.avgDurationMs ?? 0), 1);
  return (
    <ul className="space-y-3">
      {open.map((s) => (
        <li key={s.stageId} className="grid grid-cols-[120px_1fr_72px] items-center gap-4">
          <span className="flex items-center gap-2 truncate text-[13px] text-ink-700">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: s.color }} aria-hidden />
            {s.name}
          </span>
          <span className="h-1 bg-ink-200">
            <span className="block h-full bg-ink-800" style={{ width: `${((s.avgDurationMs ?? 0) / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-[12px] text-ink-900">{formatDuration(s.avgDurationMs)}</span>
        </li>
      ))}
    </ul>
  );
}

function PriorityMix({ breakdown }) {
  const total = breakdown.reduce((s, p) => s + p.count, 0) || 1;
  return (
    <ul className="space-y-2.5">
      {breakdown.map((p) => (
        <li key={p.priority}>
          <Link to={`/app/tasks?priority=${p.priority}&status=todo,in_progress`} className="group grid grid-cols-[88px_1fr_32px] items-center gap-3 text-[13px]">
            <span className={cn('flex items-center gap-2', PRIORITY[p.priority].text)}>
              <PriorityIcon priority={p.priority} /> {PRIORITY[p.priority].label}
            </span>
            <span className="h-1 bg-ink-200">
              <span className={cn('block h-full', p.priority === 'urgent' ? 'bg-brand-500' : 'bg-ink-500')} style={{ width: `${(p.count / total) * 100}%` }} />
            </span>
            <span className="text-right font-mono text-[12px] text-ink-900 group-hover:underline">{p.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pt-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-20 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 lg:col-span-8" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  useDocumentMeta({ title: 'Dashboard', noindex: true });
  const { user } = useAuth();
  const ui = useTaskUI();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary, refetchInterval: 60_000 });
  const overdue = useTaskList(OVERDUE_PARAMS);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <header className="flex flex-col gap-4 pb-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-2 font-display text-[44px] leading-[1] tracking-[-0.015em] text-ink-900 sm:text-[56px]">
            {greeting}, {user?.name?.split(' ')[0] ?? 'there'}.
          </h1>
          {data && data.totals.total > 0 && <Summary data={data} />}
        </div>
        <Button onClick={() => ui.openCreate()} className="self-start">
          <Plus /> New task
        </Button>
      </header>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : data.totals.total === 0 ? (
        <div className="border-t border-ink-200">
          <EmptyState
            icon={Layers}
            title="Nothing here yet"
            description="Create your first task and this page fills in: SLA compliance, throughput, what's due, and where work waits."
            action={<Button onClick={() => ui.openCreate()}>Create your first task</Button>}
            hint="Tip: press N anywhere to create a task."
          />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <section className="grid gap-10 border-t border-ink-900 pt-8 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-4 lg:pr-10">
              <SlaPanel sla={data.sla} />
            </div>
            <div className="lg:col-span-8 lg:border-l lg:border-ink-200 lg:pl-10">
              <p className="eyebrow mb-4">Throughput · last 14 days</p>
              <Suspense fallback={<Skeleton className="h-[250px] w-full" />}>
                <TrendChart data={data.trend} />
              </Suspense>
            </div>
          </section>

          <div className="mt-10">
            <FiguresStrip data={data} />
          </div>

          <section className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-0">
            <div className="space-y-7 lg:col-span-7 lg:pr-10">
              <h2 className="font-display text-[28px] leading-none text-ink-900">Needs attention</h2>
              <TaskGroup
                title="Overdue"
                tasks={overdue.data?.data ?? []}
                empty="Nothing overdue."
                link={
                  data.totals.overdue > 5 && (
                    <Link to="/app/tasks?overdue=true" className="text-[12.5px] text-ink-500 hover:text-ink-900">
                      All {data.totals.overdue} →
                    </Link>
                  )
                }
              />
              <TaskGroup title="Due today" tasks={data.dueToday} empty="Nothing else due today." />
              <TaskGroup
                title="Next 7 days"
                tasks={data.upcoming}
                empty="No deadlines this week."
                link={
                  <Link to="/app/tasks?sort=dueDate&order=asc" className="text-[12.5px] text-ink-500 hover:text-ink-900">
                    By due date →
                  </Link>
                }
              />
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-ink-200 lg:pl-10">
              <h2 className="mb-6 font-display text-[28px] leading-none text-ink-900">Activity</h2>
              <ActivityTimeline events={data.recentActivity} withTitle ringClass="ring-paper-100" />
            </div>
          </section>

          <section className="mt-12 grid gap-10 border-t border-ink-200 pt-8 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-7 lg:pr-10">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="font-display text-[28px] leading-none text-ink-900">Where work waits</h2>
                <Link to="/app/pipeline" className="text-[12.5px] text-ink-500 hover:text-ink-900">
                  Pipeline →
                </Link>
              </div>
              <p className="-mt-2 mb-5 text-[13px] text-ink-500">Average time a task spends in each stage before moving on, from recorded transitions.</p>
              <StageTimes stages={data.stageStats} />
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-ink-200 lg:pl-10">
              <h2 className="mb-5 font-display text-[28px] leading-none text-ink-900">Open by priority</h2>
              <PriorityMix breakdown={data.priorityBreakdown} />
            </div>
          </section>
        </motion.div>
      )}
    </div>
  );
}
