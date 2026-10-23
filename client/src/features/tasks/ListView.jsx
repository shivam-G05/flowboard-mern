import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ListTodo, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { cn } from '../../utils/cn.js';
import { PRIORITIES, STATUSES } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';
import { useBulkDelete, useBulkUpdate, useQuickUpdateTask, useTaskList, useWorkflow } from './queries.js';
import { TaskActionsMenu } from './TaskActionsMenu.jsx';
import { DueDate, PriorityBadge, SlaBadge, StatusIcon } from './TaskBadges.jsx';
import { useTaskUI } from './TaskUIProvider.jsx';

const PAGE_SIZES = [10, 20, 50, 100];

function SortHeader({ field, label, filters, setFilters, className }) {
  const active = filters.sort === field;
  const Icon = filters.order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cn('eyebrow py-2.5 pr-4 text-left font-medium', className)} aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => setFilters(active ? { order: filters.order === 'asc' ? 'desc' : 'asc' } : { sort: field, order: field === 'title' || field === 'dueDate' ? 'asc' : 'desc' })}
        className={cn('inline-flex items-center gap-1 rounded-sm uppercase tracking-label hover:text-ink-900', active && 'text-ink-900')}
      >
        {label}
        {active && <Icon className="h-3 w-3" />}
      </button>
    </th>
  );
}

function Th({ children, className }) {
  return (
    <th scope="col" className={cn('eyebrow py-2.5 pr-4 text-left font-medium', className)}>
      {children}
    </th>
  );
}

/** A native <select> laid invisibly over a label: looks like text, behaves like a real select (keyboard + screen reader). */
function InlinePicker({ label, value, onChange, display, children }) {
  return (
    <span className="relative inline-flex max-w-full items-center rounded-[4px] px-1 py-0.5 -mx-1 hover:bg-ink-900/[0.05] focus-within:ring-2 focus-within:ring-brand-500">
      {display}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} className="absolute inset-0 cursor-pointer opacity-0">
        {children}
      </select>
    </span>
  );
}

function TableSkeleton({ rows = 8 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i} className="border-b border-ink-200/70">
      <td className="py-3 pl-1 pr-4" colSpan={8}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="ml-auto hidden h-3.5 w-16 md:block" />
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      </td>
    </tr>
  ));
}

export function ListView({ filters, setFilters, clearFilters, activeCount }) {
  const params = useMemo(
    () => ({
      search: filters.search || undefined,
      priority: filters.priority,
      status: filters.status,
      sla: filters.sla,
      overdue: filters.overdue,
      dueFrom: filters.dueFrom,
      dueTo: filters.dueTo,
      sort: filters.sort,
      order: filters.order,
      page: filters.page,
      limit: filters.limit,
    }),
    [filters],
  );
  const { data, isLoading, isFetching, error, refetch } = useTaskList(params);
  const { data: workflow } = useWorkflow();
  const quickUpdate = useQuickUpdateTask();
  const bulkUpdate = useBulkUpdate();
  const bulkDelete = useBulkDelete();
  const ui = useTaskUI();
  const [selected, setSelected] = useState(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const tasks = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const stageById = useMemo(() => new Map((workflow?.stages ?? []).map((s) => [s._id, s])), [workflow]);

  // Selection only applies to rows on the current page.
  const pageIds = tasks.map((t) => t._id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pageIds));
  const clearSelection = () => setSelected(new Set());

  const applyBulk = async (body) => {
    await bulkUpdate.mutateAsync({ ids: selectedOnPage, ...body }).catch(() => {});
    clearSelection();
  };

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[920px] border-t border-ink-200 text-left">
          <caption className="sr-only">Tasks</caption>
          <thead className="border-b border-ink-200">
            <tr>
              <th scope="col" className="w-8 py-2.5 pl-1">
                <Checkbox checked={allSelected} indeterminate={!allSelected && selectedOnPage.length > 0} onChange={toggleAll} label="Select all tasks on this page" />
              </th>
              <SortHeader field="title" label="Task" filters={filters} setFilters={setFilters} />
              <SortHeader field="priority" label="Priority" filters={filters} setFilters={setFilters} className="w-[112px]" />
              <Th className="w-[150px]">Stage</Th>
              <Th className="w-[170px]">SLA</Th>
              <SortHeader field="dueDate" label="Due" filters={filters} setFilters={setFilters} className="w-[120px]" />
              <SortHeader field="createdAt" label="Created" filters={filters} setFilters={setFilters} className="w-[96px]" />
              <th scope="col" className="w-10">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className={cn('transition-opacity duration-150', isFetching && !isLoading && 'opacity-60')}>
            {isLoading ? (
              <TableSkeleton rows={Math.min(filters.limit, 10)} />
            ) : (
              tasks.map((task) => {
                const isSelected = selected.has(task._id);
                const stage = stageById.get(task.stage);
                const done = task.status === 'done';
                return (
                  <tr
                    key={task._id}
                    onClick={() => ui.openTask(task._id)}
                    className={cn('group cursor-pointer border-b border-ink-200/70 transition-colors', isSelected ? 'bg-brand-50' : 'hover:bg-ink-900/[0.025]')}
                  >
                    <td className="py-2 pl-1 align-middle">
                      <Checkbox checked={isSelected} onChange={() => toggleOne(task._id)} label={`Select ${task.title}`} />
                    </td>
                    <td className="max-w-0 py-2 pr-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <StatusIcon status={task.status} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            ui.openTask(task._id);
                          }}
                          className={cn('min-w-0 flex-1 truncate rounded-sm text-left text-[13.5px] font-medium text-ink-900', done && 'text-ink-500 line-through decoration-ink-300')}
                          title={task.title}
                        >
                          {task.title}
                        </button>
                        {task.assignee && <span className="hidden max-w-[96px] shrink-0 truncate text-[12px] text-ink-500 lg:inline">{task.assignee}</span>}
                      </div>
                    </td>
                    <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                      <InlinePicker label={`Priority for ${task.title}`} value={task.priority} onChange={(priority) => quickUpdate.mutate({ id: task._id, priority })} display={<PriorityBadge priority={task.priority} />}>
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </InlinePicker>
                    </td>
                    <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                      <InlinePicker
                        label={`Stage for ${task.title}`}
                        value={task.stage}
                        onChange={(stageId) => quickUpdate.mutate({ id: task._id, stageId })}
                        display={
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-700">
                            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: stage?.color ?? '#A09B8F' }} aria-hidden />
                            <span className="truncate">{stage?.name ?? '—'}</span>
                          </span>
                        }
                      >
                        {workflow?.stages.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </InlinePicker>
                    </td>
                    <td className="py-2 pr-4">
                      <SlaBadge sla={task.sla} />
                    </td>
                    <td className="py-2 pr-4">
                      <DueDate value={task.dueDate} overdue={task.isOverdue} done={done} />
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-[11.5px] text-ink-500">{formatDate(task.createdAt, 'MMM d')}</td>
                    <td className="py-2 pr-1 text-right" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-block opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <TaskActionsMenu task={task} />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && tasks.length === 0 && (
        <EmptyState
          icon={ListTodo}
          title={activeCount ? 'Nothing matches these filters' : 'No tasks yet'}
          description={activeCount ? 'Remove a filter or try a different search.' : 'Capture the first piece of work — give it a deadline and an SLA target, and Flowboard will track it from there.'}
          action={
            activeCount ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => ui.openCreate()}>Create a task</Button>
            )
          }
          hint={activeCount ? null : 'Tip: press N anywhere to create a task.'}
        />
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px] text-ink-500">
          <p className="font-mono tabular" aria-live="polite">
            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              Rows
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ limit: Number(e.target.value) })}
                className="h-7 cursor-pointer rounded-[4px] border border-ink-300 bg-paper-50 px-1.5 font-mono text-[12px] text-ink-800"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" disabled={pagination.page <= 1} onClick={() => setFilters({ page: pagination.page - 1 })} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="px-1 font-mono tabular text-ink-700">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button variant="ghost" size="icon-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters({ page: pagination.page + 1 })} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bulk bar — appears only while rows are selected. */}
      {createPortal(
        <AnimatePresence>
          {selectedOnPage.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              role="toolbar"
              aria-label="Bulk actions"
              className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-ink-900 py-1.5 pl-4 pr-1.5 text-[13px] text-paper-100 shadow-float"
            >
              <span className="mr-2 font-mono text-[12px]">{selectedOnPage.length} selected</span>
              <select
                aria-label="Move selected tasks"
                value=""
                disabled={bulkUpdate.isPending}
                onChange={(e) => e.target.value && applyBulk(e.target.value.startsWith('stage:') ? { stageId: e.target.value.slice(6) } : { status: e.target.value })}
                className="h-7 cursor-pointer rounded-[4px] border border-paper-100/20 bg-transparent px-2 text-[12.5px] text-paper-100 [&_option]:text-ink-900"
              >
                <option value="">Move to…</option>
                <optgroup label="Status">
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Stage">
                  {workflow?.stages.map((s) => (
                    <option key={s._id} value={`stage:${s._id}`}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <select
                aria-label="Set priority for selected tasks"
                value=""
                disabled={bulkUpdate.isPending}
                onChange={(e) => e.target.value && applyBulk({ priority: e.target.value })}
                className="h-7 cursor-pointer rounded-[4px] border border-paper-100/20 bg-transparent px-2 text-[12.5px] text-paper-100 [&_option]:text-ink-900"
              >
                <option value="">Priority…</option>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button onClick={() => setConfirmBulkDelete(true)} className="flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[12.5px] text-brand-300 hover:bg-paper-100/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={clearSelection} className="grid h-7 w-7 place-items-center rounded-[4px] text-paper-100/70 hover:bg-paper-100/10 hover:text-paper-50" aria-label="Clear selection">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        loading={bulkDelete.isPending}
        title={`Delete ${selectedOnPage.length} task${selectedOnPage.length === 1 ? '' : 's'}?`}
        description="They will be permanently removed. This can't be undone."
        onConfirm={async () => {
          await bulkDelete.mutateAsync(selectedOnPage).catch(() => {});
          setConfirmBulkDelete(false);
          clearSelection();
        }}
      />
    </div>
  );
}
