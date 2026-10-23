import { motion } from 'framer-motion';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { cn } from '../../utils/cn.js';
import { PRIORITY, STATUS } from '../../utils/constants.js';
import { formatDate, timeAgo } from '../../utils/format.js';

// Events are marked with a small square on the timeline rail; only outcomes get colour.
const MARKERS = {
  created: 'bg-ink-900',
  completed: 'bg-good-500',
  reopened: 'bg-warn-500',
  deleted: 'bg-bad-500',
  priority_changed: 'bg-ink-500',
  due_date_changed: 'bg-ink-500',
  status_changed: 'bg-ink-500',
  updated: 'bg-ink-300',
  duplicated: 'bg-ink-300',
};

const FIELD_LABELS = {
  title: 'title', description: 'description', startDate: 'start date', estimatedHours: 'estimate',
  slaHours: 'SLA target', tags: 'tags', assignee: 'assignee',
};

function valueText(field, value) {
  if (value === null || value === undefined || value === '') return 'none';
  if (field === 'priority') return PRIORITY[value]?.label ?? value;
  if (field === 'status') return STATUS[value]?.label ?? value;
  if (field === 'dueDate' || field === 'startDate') return formatDate(value, 'MMM d, h:mm a');
  if (field === 'slaHours' || field === 'estimatedHours') return `${value}h`;
  if (Array.isArray(value)) return value.length ? value.map((t) => `#${t}`).join(' ') : 'none';
  return String(value);
}

/** Turns a stored activity event into one readable sentence. */
export function describeActivity(event, { withTitle = false } = {}) {
  const subject = withTitle ? <span className="font-medium text-ink-900">{event.taskTitle}</span> : 'this task';
  const change = (field) => event.changes?.find((c) => c.field === field);
  switch (event.type) {
    case 'created':
      return <>Created {subject}</>;
    case 'completed':
      return <>Completed {subject}</>;
    case 'reopened':
      return <>Reopened {subject}</>;
    case 'deleted':
      return <>Deleted {subject}</>;
    case 'duplicated':
      return <>Created {subject} as a copy of &ldquo;{change('source')?.to}&rdquo;</>;
    case 'status_changed': {
      const stage = change('stage') ?? change('status');
      return (
        <>
          Moved {withTitle && <>{subject} </>}from <b className="font-medium text-ink-800">{valueText(stage?.field, stage?.from)}</b> to{' '}
          <b className="font-medium text-ink-800">{valueText(stage?.field, stage?.to)}</b>
        </>
      );
    }
    case 'priority_changed': {
      const c = change('priority');
      return (
        <>
          Changed priority {withTitle && <>of {subject} </>}from {valueText('priority', c?.from)} to <b className="font-medium text-ink-800">{valueText('priority', c?.to)}</b>
        </>
      );
    }
    case 'due_date_changed': {
      const c = change('dueDate');
      return (
        <>
          {c?.to ? 'Set' : 'Removed'} due date {withTitle && <>of {subject} </>}
          {c?.to && <b className="font-medium text-ink-800">{valueText('dueDate', c.to)}</b>}
        </>
      );
    }
    case 'updated':
      return (
        <>
          Edited {(event.changes ?? []).map((c) => FIELD_LABELS[c.field] ?? c.field).join(', ')} {withTitle && <>on {subject}</>}
        </>
      );
    default:
      return event.type;
  }
}

/** Chronological event list on a thin rail. `withTitle` names the task in each line (dashboard feed). */
export function ActivityTimeline({ events, isLoading, withTitle = false, ringClass = 'ring-paper-50' }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-3.5 w-4/5" />
        ))}
      </div>
    );
  }
  if (!events?.length) return <p className="text-[13px] text-ink-500">No activity yet.</p>;

  return (
    <ol className="relative space-y-3.5 before:absolute before:bottom-1 before:left-[3px] before:top-2 before:w-px before:bg-ink-200">
      {events.map((event, i) => (
        <motion.li
          key={event._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
          className="relative flex gap-3"
        >
          <span className={cn('relative z-10 mt-[7px] h-[7px] w-[7px] shrink-0 rounded-[1px] ring-[3px]', ringClass, MARKERS[event.type] ?? MARKERS.updated)} aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-ink-600">{describeActivity(event, { withTitle })}</p>
            <time className="font-mono text-[11px] text-ink-400" dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString()}>
              {timeAgo(event.createdAt)}
            </time>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
