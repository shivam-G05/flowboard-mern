import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, ListFilter, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce.js';
import { cn } from '../../utils/cn.js';
import { PRIORITIES, PRIORITY, SLA_FILTERS, SORT_OPTIONS, STATUS, STATUSES } from '../../utils/constants.js';
import { PriorityIcon, StatusIcon } from './TaskBadges.jsx';

/** Toggleable option inside the filter strip. */
function Option({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[12.5px] transition-colors',
        active ? 'bg-ink-900 text-paper-50' : 'text-ink-700 hover:bg-ink-900/[0.06]',
      )}
    >
      {children}
    </button>
  );
}

/** One labelled group in the filter strip; groups wrap and are separated by thin rules. */
function FilterGroup({ label, children }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1 border-r border-ink-200 px-3 py-2 last:border-r-0">
      <span className="eyebrow mr-2">{label}</span>
      {children}
    </div>
  );
}

/** A removable token showing one active filter. */
function Token({ label, onRemove }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-ink-300 bg-paper-50 pl-2 pr-1 text-[12px] text-ink-800">
      {label}
      <button type="button" onClick={onRemove} className="rounded-sm p-0.5 text-ink-400 hover:text-ink-900" aria-label={`Remove filter ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function toLocalDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Debounced search: typing updates the box instantly; the URL (and API call) only after 350 ms of quiet. */
function SearchBox({ value, onChange }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 350);
  const inputRef = useRef(null);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => setText(value), [value]); // stay in sync when filters are cleared elsewhere

  // "/" focuses search, like most productivity tools.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative w-full min-w-0 sm:w-auto sm:max-w-[280px] sm:flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-400" strokeWidth={1.75} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search tasks"
        placeholder="Search title or description"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && (setText(''), e.currentTarget.blur())}
        className="field h-8 pl-8 pr-8 text-[13px]"
      />
      {!text && <span className="kbd pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</span>}
    </div>
  );
}

export function TaskToolbar({ filters, setFilters, clearFilters, activeCount, showSort = true, children }) {
  const [open, setOpen] = useState(false);

  const tokens = [
    ...filters.priority.map((p) => ({ key: `p-${p}`, label: `Priority: ${PRIORITY[p]?.label}`, remove: () => setFilters({ priority: toggle(filters.priority, p) }) })),
    ...filters.status.map((s) => ({ key: `s-${s}`, label: `Status: ${STATUS[s]?.label}`, remove: () => setFilters({ status: toggle(filters.status, s) }) })),
    ...(filters.sla ? [{ key: 'sla', label: `SLA: ${SLA_FILTERS.find((x) => x.value === filters.sla)?.label}`, remove: () => setFilters({ sla: undefined }) }] : []),
    ...(filters.overdue === 'true' ? [{ key: 'overdue', label: 'Overdue', remove: () => setFilters({ overdue: undefined }) }] : []),
    ...(filters.dueFrom ? [{ key: 'from', label: `Due from ${toLocalDate(filters.dueFrom)}`, remove: () => setFilters({ dueFrom: undefined }) }] : []),
    ...(filters.dueTo ? [{ key: 'to', label: `Due until ${toLocalDate(filters.dueTo)}`, remove: () => setFilters({ dueTo: undefined }) }] : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 py-3">
        <SearchBox value={filters.search} onChange={(search) => setFilters({ search })} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors',
            open ? 'border-ink-900 text-ink-900' : 'border-ink-300 text-ink-700 hover:border-ink-500',
          )}
        >
          <ListFilter className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Filter
          {activeCount > 0 && <span className="font-mono text-[11px] text-brand-600">{activeCount}</span>}
        </button>

        {showSort && (
          <div className="flex h-8 items-center rounded-md border border-ink-300">
            <label htmlFor="sort-select" className="pl-2.5 text-[12.5px] text-ink-500">
              Sort
            </label>
            <select
              id="sort-select"
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value })}
              className="h-full cursor-pointer appearance-none bg-transparent pl-1.5 pr-1 text-[13px] font-medium text-ink-900 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFilters({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
              className="grid h-full w-8 place-items-center border-l border-ink-300 text-ink-500 hover:text-ink-900"
              aria-label={`Sorted ${filters.order === 'asc' ? 'ascending' : 'descending'} — reverse`}
              title={filters.order === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowDownUp className={cn('h-[15px] w-[15px] transition-transform', filters.order === 'asc' && 'rotate-180')} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-stretch border-y border-ink-200 bg-paper-200/50">
              <FilterGroup label="Priority">
                {PRIORITIES.map((p) => (
                  <Option key={p.value} active={filters.priority.includes(p.value)} onClick={() => setFilters({ priority: toggle(filters.priority, p.value) })}>
                    <PriorityIcon priority={p.value} />
                    {p.label}
                  </Option>
                ))}
              </FilterGroup>
              <FilterGroup label="Status">
                {STATUSES.map((s) => (
                  <Option key={s.value} active={filters.status.includes(s.value)} onClick={() => setFilters({ status: toggle(filters.status, s.value) })}>
                    <StatusIcon status={s.value} />
                    {s.label}
                  </Option>
                ))}
              </FilterGroup>
              <FilterGroup label="SLA">
                {SLA_FILTERS.map((s) => (
                  <Option key={s.value} active={filters.sla === s.value} onClick={() => setFilters({ sla: filters.sla === s.value ? undefined : s.value })}>
                    {s.label}
                  </Option>
                ))}
                <Option active={filters.overdue === 'true'} onClick={() => setFilters({ overdue: filters.overdue === 'true' ? undefined : 'true' })}>
                  Overdue
                </Option>
              </FilterGroup>
              <FilterGroup label="Due">
                <input
                  type="date"
                  aria-label="Due from"
                  value={filters.dueFrom ? toLocalDate(filters.dueFrom) : ''}
                  onChange={(e) => setFilters({ dueFrom: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined })}
                  className="field h-7 w-[136px] px-2 text-[12.5px]"
                />
                <span className="text-ink-400">–</span>
                <input
                  type="date"
                  aria-label="Due until"
                  value={filters.dueTo ? toLocalDate(filters.dueTo) : ''}
                  onChange={(e) => setFilters({ dueTo: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })}
                  className="field h-7 w-[136px] px-2 text-[12.5px]"
                />
              </FilterGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pb-3 pt-1">
          {tokens.map((t) => (
            <Token key={t.key} label={t.label} onRemove={t.remove} />
          ))}
          <button type="button" onClick={clearFilters} className="ml-1 rounded-sm text-[12px] text-ink-500 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
