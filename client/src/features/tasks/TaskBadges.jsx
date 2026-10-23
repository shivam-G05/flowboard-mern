import { cn } from '../../utils/cn.js';
import { PRIORITY, SLA_HEALTH, STATUS } from '../../utils/constants.js';
import { formatDueDate, formatDuration } from '../../utils/format.js';

/** Signal-strength bars: one to three bars for low→high, a solid accent block with "!" for urgent. */
export function PriorityIcon({ priority, className }) {
  const p = PRIORITY[priority] ?? PRIORITY.medium;
  if (p.level === 4) {
    return (
      <svg viewBox="0 0 14 14" className={cn('h-3.5 w-3.5 shrink-0', className)} role="img" aria-label="Urgent priority">
        <rect width="14" height="14" rx="3" fill="#D4552F" />
        <rect x="6.1" y="3" width="1.8" height="5" rx="0.6" fill="#fff" />
        <rect x="6.1" y="9.4" width="1.8" height="1.8" rx="0.6" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 14 14" className={cn('h-3.5 w-3.5 shrink-0', className)} role="img" aria-label={`${p.label} priority`}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1 + i * 4.5} y={9 - i * 3.5} width="3" height={4 + i * 3.5} rx="0.8" fill={i < p.level ? '#2B2925' : '#CFCBC0'} />
      ))}
    </svg>
  );
}

export function PriorityBadge({ priority, showLabel = true }) {
  const p = PRIORITY[priority] ?? PRIORITY.medium;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px]', p.text)}>
      <PriorityIcon priority={priority} />
      {showLabel && p.label}
    </span>
  );
}

/** Status glyph: open ring (to do), half-filled ring (in progress), filled ring with a tick (done). */
export function StatusIcon({ status, className }) {
  const label = STATUS[status]?.label ?? status;
  const common = { viewBox: '0 0 16 16', className: cn('h-[15px] w-[15px] shrink-0', className), role: 'img', 'aria-label': label };
  if (status === 'done') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="7" fill="#3F7A57" />
        <path d="M5 8.2 7 10.2 11 6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'in_progress') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="#B7791F" strokeWidth="1.5" />
        <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill="#B7791F" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="#A09B8F" strokeWidth="1.5" strokeDasharray="2.2 1.6" />
    </svg>
  );
}

/** Workflow stage: the user's swatch plus the stage name. */
export function StageBadge({ stage, status }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-700">
      <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: stage?.color ?? STATUS[status]?.accent }} aria-hidden />
      <span className="truncate">{stage?.name ?? STATUS[status]?.label ?? status}</span>
    </span>
  );
}

/** SLA health as a dot + word, with remaining/overrun time when it helps. */
export function SlaBadge({ sla, compact = false }) {
  const health = sla?.health ?? 'none';
  if (compact && health === 'none') return null;
  const meta = SLA_HEALTH[health];
  let detail = '';
  if (sla?.remainingMs != null && (health === 'on_track' || health === 'at_risk')) detail = `${formatDuration(sla.remainingMs)} left`;
  if (sla?.remainingMs != null && health === 'breached' && sla.remainingMs < 0) detail = `+${formatDuration(-sla.remainingMs)}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12px]', meta.text)} title={`SLA: ${meta.label}${detail ? ` (${detail})` : ''}`}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} aria-hidden />
      {meta.short}
      {!compact && detail && <span className="font-mono text-[11px] text-ink-400">{detail}</span>}
    </span>
  );
}

export function DueDate({ value, overdue, done, className }) {
  if (!value) return <span className={cn('text-ink-300', className)}>—</span>;
  return (
    <span
      className={cn('whitespace-nowrap font-mono text-[11.5px]', overdue ? 'text-bad-600' : done ? 'text-ink-400' : 'text-ink-600', className)}
      title={new Date(value).toLocaleString()}
    >
      {formatDueDate(value)}
      {overdue && <span className="sr-only"> (overdue)</span>}
    </span>
  );
}

/** Thin progress line of SLA time used, with a tick at the 75% at-risk threshold. */
export function SlaMeter({ sla }) {
  if (!sla || sla.health === 'none') {
    return <p className="text-[13px] text-ink-500">No SLA target on this task.</p>;
  }
  const meta = SLA_HEALTH[sla.health];
  const pct = Math.min(100, sla.percentUsed);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[28px] leading-none text-ink-900">
          {sla.percentUsed}
          <span className="text-[18px] text-ink-400">%</span>
        </span>
        <span className={cn('text-right text-[12.5px]', meta.text)}>
          {sla.health === 'met' && `Completed in ${formatDuration(sla.elapsedMs)}`}
          {sla.health === 'breached' && `${formatDuration(-sla.remainingMs)} over the ${sla.targetHours}h target`}
          {(sla.health === 'on_track' || sla.health === 'at_risk') && `${formatDuration(sla.remainingMs)} of ${sla.targetHours}h left`}
        </span>
      </div>
      <div className="relative mt-3 h-1 bg-ink-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="SLA time used">
        <div className={cn('h-full transition-[width] duration-500', meta.bar)} style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 left-3/4 h-3 w-px bg-ink-500" title="At-risk threshold (75%)" aria-hidden />
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-400">Elapsed {formatDuration(sla.elapsedMs)} since creation · calendar time · at risk from 75%</p>
    </div>
  );
}
