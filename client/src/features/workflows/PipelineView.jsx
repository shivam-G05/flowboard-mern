import { ArrowLeft, ArrowRight, MoreHorizontal, Palette, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Dropdown } from '../../components/ui/Dropdown.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { formatDuration } from '../../utils/format.js';
import { useBoardTasks, useMoveTask, useStageStats, useWorkflow } from '../tasks/queries.js';
import { TaskBoard } from '../tasks/TaskBoard.jsx';
import { useTaskUI } from '../tasks/TaskUIProvider.jsx';
import { BoardNotice, BoardSkeleton } from './BoardStates.jsx';
import { useReorderStages } from './queries.js';
import { DeleteStageDialog, StageDialog } from './StageDialogs.jsx';

/**
 * Workflow progression at a glance: each stage gets width in proportion to how many tasks sit in it,
 * with the average time tasks spend there. Counts are for the whole workflow (unfiltered).
 */
function FlowStrip({ stages, statsById }) {
  const total = stages.reduce((sum, s) => sum + (statsById.get(s._id)?.count ?? 0), 0);
  return (
    <section aria-label="Workflow progression" className="mb-6">
      <p className="eyebrow mb-3">
        Workflow · {total} tasks · width shows where work sits
      </p>
      <ol className="scrollbar-thin flex overflow-x-auto">
        {stages.map((stage, i) => {
          const s = statsById.get(stage._id);
          const count = s?.count ?? 0;
          const time = stage.category === 'done' ? s?.avgLeadMs : s?.avgDurationMs;
          return (
            <li key={stage._id} className="min-w-[128px] pr-px" style={{ flexGrow: Math.max(count, 1), flexBasis: 0 }}>
              <div className="h-[3px]" style={{ backgroundColor: stage.color }} />
              <div className="flex items-baseline gap-2 pr-3 pt-2.5">
                <span className="font-display text-[30px] leading-none text-ink-900">{count}</span>
                <span className="truncate text-[12.5px] text-ink-600">{stage.name}</span>
                {i < stages.length - 1 && <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 self-center text-ink-300" aria-hidden />}
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-400">
                {stage.category === 'done' ? 'lead time ' : 'avg here '}
                {formatDuration(time)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Compact metrics under each stage header — computed server-side from stage history (GET /workflow/stats). */
function StageMeta({ stats }) {
  if (!stats) return <p className="font-mono text-[11px] text-ink-300">—</p>;
  const items =
    stats.category === 'done'
      ? [
          ['lead', formatDuration(stats.avgLeadMs)],
          ['breached', stats.slaBreached, stats.slaBreached ? 'text-bad-600' : ''],
        ]
      : [
          ['avg', formatDuration(stats.avgDurationMs)],
          ['through', stats.exits],
          ['risk', stats.slaAtRisk, stats.slaAtRisk ? 'text-warn-600' : ''],
          ['late', stats.slaBreached, stats.slaBreached ? 'text-bad-600' : ''],
        ];
  return (
    <dl className="flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-400">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex gap-1">
          <dt>{label}</dt>
          <dd className={tone || 'text-ink-700'}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PipelineView({ filterParams }) {
  const { data: workflow, isLoading: workflowLoading, error: workflowError } = useWorkflow();
  const { data, isLoading, error, refetch } = useBoardTasks(filterParams);
  const { data: stats } = useStageStats();
  const move = useMoveTask();
  const reorder = useReorderStages();
  const ui = useTaskUI();
  const [stageDialog, setStageDialog] = useState({ open: false, stage: null });
  const [deleting, setDeleting] = useState(null);

  const statsById = useMemo(() => new Map((stats ?? []).map((s) => [s.stageId, s])), [stats]);
  const stages = useMemo(() => workflow?.stages ?? [], [workflow]);
  const columns = useMemo(
    () =>
      stages.map((s, i) => ({
        id: s._id,
        title: s.name,
        stage: s,
        marker: (
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-ink-400">{String(i + 1).padStart(2, '0')}</span>
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.color }} aria-hidden />
          </span>
        ),
      })),
    [stages],
  );
  const getColumnId = useCallback((task) => task.stage, []);

  const moveStage = (index, delta) => {
    const ids = stages.map((s) => s._id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };

  if (workflowError || error) return <ErrorState error={workflowError ?? error} onRetry={refetch} />;
  if (workflowLoading || isLoading) return <BoardSkeleton columns={5} />;

  return (
    <>
      <FlowStrip stages={stages} statsById={statsById} />
      <BoardNotice meta={data?.meta} shown={data?.data.length} />
      <TaskBoard
        columns={columns}
        tasks={data.data}
        getColumnId={getColumnId}
        onMove={(task, stageId) => move.mutate({ id: task._id, stageId })}
        onOpen={ui.openTask}
        onAdd={(column) => ui.openCreate({ stageId: column.id })}
        renderMeta={(column) => <StageMeta stats={statsById.get(column.id)} />}
        renderHeader={(column) => {
          const index = stages.findIndex((s) => s._id === column.id);
          return (
            <Dropdown
              label={`Stage options for ${column.title}`}
              trigger={
                <span className="grid h-6 w-6 place-items-center rounded-md text-ink-400 hover:bg-ink-900/5 hover:text-ink-800">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              }
              items={[
                { label: 'Edit stage', icon: Palette, onSelect: () => setStageDialog({ open: true, stage: column.stage }) },
                { label: 'Move left', icon: ArrowLeft, disabled: index === 0, onSelect: () => moveStage(index, -1) },
                { label: 'Move right', icon: ArrowRight, disabled: index === stages.length - 1, onSelect: () => moveStage(index, 1) },
                { divider: true },
                { label: 'Delete stage', icon: Trash2, danger: true, onSelect: () => setDeleting(column.stage) },
              ]}
            />
          );
        }}
        trailing={
          <div className="flex w-[180px] shrink-0 border-l border-ink-200 px-3 pt-3">
            <button
              onClick={() => setStageDialog({ open: true, stage: null })}
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-ink-500 hover:bg-ink-900/[0.04] hover:text-ink-900"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} /> Add stage
            </button>
          </div>
        }
      />

      <StageDialog open={stageDialog.open} stage={stageDialog.stage} onClose={() => setStageDialog({ open: false, stage: null })} />
      <DeleteStageDialog
        open={!!deleting}
        stage={deleting}
        stages={stages}
        taskCount={deleting ? (statsById.get(deleting._id)?.count ?? 0) : 0}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
