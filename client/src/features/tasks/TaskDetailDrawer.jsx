import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { PRIORITIES } from '../../utils/constants.js';
import { formatDate, formatDuration } from '../../utils/format.js';
import { ActivityTimeline } from './ActivityTimeline.jsx';
import { useCompleteTask, useDuplicateTask, useQuickUpdateTask, useTask, useTaskActivity, useWorkflow } from './queries.js';
import { DueDate, PriorityBadge, SlaBadge, SlaMeter, StatusIcon } from './TaskBadges.jsx';
import { useTaskUI } from './TaskUIProvider.jsx';

function Property({ label, children }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-3 py-[7px]">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className="min-w-0 text-[13px] text-ink-900">{children}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-ink-200 px-6 py-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

/** Time spent in each stage, as thin bars relative to the longest. */
function StageBreakdown({ durations, stages }) {
  if (!durations?.length) return <p className="text-[13px] text-ink-500">No stage history yet.</p>;
  const max = Math.max(...durations.map((d) => d.durationMs), 1);
  const colorOf = (id) => stages?.find((s) => s._id === id)?.color ?? '#A09B8F';
  return (
    <ul className="space-y-2.5">
      {durations.map((d) => (
        <li key={d.stage} className="grid grid-cols-[112px_1fr_64px] items-center gap-3">
          <span className="truncate text-[12.5px] text-ink-700">
            {d.stageName}
            {d.visits > 1 && <span className="text-ink-400"> ×{d.visits}</span>}
          </span>
          <span className="h-1 bg-ink-200">
            <span className="block h-full" style={{ width: `${Math.max(2, (d.durationMs / max) * 100)}%`, backgroundColor: colorOf(d.stage) }} />
          </span>
          <span className="text-right font-mono text-[11.5px] text-ink-700">{formatDuration(d.durationMs)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Small borderless select for editing a property in place. */
function PropertySelect({ label, value, onChange, children }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="-ml-1.5 h-7 max-w-full cursor-pointer rounded-[4px] border border-transparent bg-transparent pl-1.5 pr-6 text-[13px] text-ink-900 hover:border-ink-300 focus:border-ink-900 focus:outline-none"
    >
      {children}
    </select>
  );
}

function DrawerBody({ taskId }) {
  const { data: task, isLoading, error, refetch } = useTask(taskId);
  const { data: activity, isLoading: activityLoading } = useTaskActivity(taskId);
  const { data: workflow } = useWorkflow();
  const ui = useTaskUI();
  const complete = useCompleteTask();
  const duplicate = useDuplicateTask();
  const quickUpdate = useQuickUpdateTask();

  if (isLoading) {
    return (
      <div className="space-y-4 px-6 py-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} className="m-6" />;

  return (
    <>
      <div className="px-6 pb-5 pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <PriorityBadge priority={task.priority} />
          <SlaBadge sla={task.sla} />
          {task.isOverdue && <span className="text-[12px] font-medium text-bad-600">Overdue</span>}
        </div>
        <h2 className="mt-3 break-words font-display text-[30px] leading-[1.1] text-ink-900">{task.title}</h2>
        {task.description ? (
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700">{task.description}</p>
        ) : (
          <button onClick={() => ui.openEdit(task)} className="mt-3 rounded-sm text-[13.5px] text-ink-400 hover:text-ink-700">
            Add a description…
          </button>
        )}

        <div className="mt-5 flex flex-wrap gap-1.5">
          {task.status !== 'done' && (
            <Button size="sm" onClick={() => complete.mutate(task._id)} loading={complete.isPending}>
              <Check /> Mark complete
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => ui.openEdit(task)}>
            <Pencil /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(task._id)} loading={duplicate.isPending}>
            <Copy /> Duplicate
          </Button>
          <Button size="sm" variant="danger-ghost" className="ml-auto" onClick={() => ui.confirmDelete(task)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <Section title="Properties">
        <dl>
          <Property label="Stage">
            <span className="flex items-center gap-2">
              <StatusIcon status={task.status} />
              <PropertySelect label="Move to stage" value={task.stage} onChange={(stageId) => quickUpdate.mutate({ id: task._id, stageId })}>
                {workflow?.stages.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </PropertySelect>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-400">{formatDuration(task.timeInStageMs)} here</span>
            </span>
          </Property>
          <Property label="Priority">
            <PropertySelect label="Priority" value={task.priority} onChange={(priority) => quickUpdate.mutate({ id: task._id, priority })}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </PropertySelect>
          </Property>
          <Property label="Due">
            <DueDate value={task.dueDate} overdue={task.isOverdue} done={task.status === 'done'} />
          </Property>
          <Property label="Start">
            <span className="font-mono text-[11.5px] text-ink-600">{formatDate(task.startDate, 'MMM d, h:mm a')}</span>
          </Property>
          <Property label="Estimate">
            <span className="font-mono text-[11.5px] text-ink-600">
              {task.estimatedHours != null ? `${task.estimatedHours}h` : '—'}
              {task.completedAt && <span className="text-ink-400"> · took {formatDuration(new Date(task.completedAt) - new Date(task.createdAt))}</span>}
            </span>
          </Property>
          <Property label="Assignee">{task.assignee ?? <span className="text-ink-400">Unassigned</span>}</Property>
          <Property label="Tags">{task.tags?.length ? <span className="text-ink-600">{task.tags.map((t) => `#${t}`).join('  ')}</span> : <span className="text-ink-400">—</span>}</Property>
          <Property label="Created">
            <span className="font-mono text-[11.5px] text-ink-600">
              {formatDate(task.createdAt, 'MMM d, yyyy h:mm a')}
              <span className="text-ink-400"> · updated {formatDate(task.updatedAt, 'MMM d')}</span>
            </span>
          </Property>
        </dl>
      </Section>

      <Section title="SLA">
        <SlaMeter sla={task.sla} />
      </Section>

      <Section title="Time in each stage">
        <StageBreakdown durations={task.stageDurations} stages={workflow?.stages} />
      </Section>

      <Section title="Activity">
        <ActivityTimeline events={activity} isLoading={activityLoading} />
      </Section>
    </>
  );
}

/** Slide-over panel on the right (full width on mobile). */
export function TaskDetailDrawer({ taskId, onClose }) {
  const open = !!taskId;
  const ref = useFocusTrap(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div className="absolute inset-0 bg-ink-950/15" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} aria-hidden />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Task details"
            tabIndex={-1}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col border-l border-ink-200 bg-paper-50 shadow-float outline-none"
          >
            <div className="flex h-11 items-center justify-between border-b border-ink-200 px-4">
              <span className="eyebrow">Task</span>
              <span className="flex items-center gap-2 text-[11.5px] text-ink-400">
                <span className="kbd">Esc</span>
                <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900" aria-label="Close task details">
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <DrawerBody taskId={taskId} />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
