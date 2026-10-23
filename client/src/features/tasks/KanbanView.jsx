import { useCallback } from 'react';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { STATUSES } from '../../utils/constants.js';
import { BoardNotice, BoardSkeleton } from '../workflows/BoardStates.jsx';
import { useBoardTasks, useMoveTask } from './queries.js';
import { StatusIcon } from './TaskBadges.jsx';
import { TaskBoard } from './TaskBoard.jsx';
import { useTaskUI } from './TaskUIProvider.jsx';

const COLUMNS = STATUSES.map((s) => ({ id: s.value, title: s.label, marker: <StatusIcon status={s.value} /> }));

/** One quiet line per column: only the things that need attention. */
function ColumnSignals({ tasks }) {
  const overdue = tasks.filter((t) => t.isOverdue).length;
  const breached = tasks.filter((t) => t.sla?.health === 'breached' && t.status !== 'done').length;
  const atRisk = tasks.filter((t) => t.sla?.health === 'at_risk').length;
  const parts = [];
  if (overdue) parts.push(<span key="o" className="text-bad-600">{overdue} overdue</span>);
  if (breached) parts.push(<span key="b" className="text-bad-600">{breached} breached</span>);
  if (atRisk) parts.push(<span key="r" className="text-warn-600">{atRisk} at risk</span>);
  if (!parts.length) return <p className="font-mono text-[11px] text-ink-400">Nothing urgent</p>;
  return <p className="flex flex-wrap gap-x-3 font-mono text-[11px]">{parts}</p>;
}

/**
 * Kanban groups tasks by status category (To Do / In Progress / Done).
 * Dropping a card in a column sends PATCH /tasks/:id/move { status }; the server puts it in the
 * first workflow stage of that category. The Pipeline view shows the finer-grained stages.
 */
export function KanbanView({ filterParams }) {
  const { data, isLoading, error, refetch } = useBoardTasks(filterParams);
  const move = useMoveTask();
  const ui = useTaskUI();
  const getColumnId = useCallback((task) => task.status, []);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <BoardSkeleton columns={3} />;

  return (
    <>
      <BoardNotice meta={data?.meta} shown={data?.data.length} />
      <TaskBoard
        columns={COLUMNS}
        tasks={data.data}
        getColumnId={getColumnId}
        onMove={(task, status) => move.mutate({ id: task._id, status })}
        onOpen={ui.openTask}
        onAdd={(column) => ui.openCreate({ status: column.id })}
        renderMeta={(column, tasks) => (column.id === 'done' ? <p className="font-mono text-[11px] text-ink-400">Completed work</p> : <ColumnSignals tasks={tasks} />)}
        stretch
      />
    </>
  );
}
