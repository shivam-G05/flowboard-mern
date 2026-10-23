import { AlertTriangle, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import { cn } from '../../utils/cn.js';
import { STAGE_COLORS, STATUSES } from '../../utils/constants.js';
import { pluralize } from '../../utils/format.js';
import { useAddStage, useDeleteStage, useUpdateStage } from './queries.js';

/** Add a new stage or edit an existing one (name, status category, colour). */
export function StageDialog({ open, onClose, stage }) {
  const add = useAddStage();
  const update = useUpdateStage();
  const [values, setValues] = useState({ name: '', category: 'in_progress', color: STAGE_COLORS[2] });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(stage ? { name: stage.name, category: stage.category, color: stage.color } : { name: '', category: 'in_progress', color: STAGE_COLORS[2] });
      setError('');
    }
  }, [open, stage]);

  async function onSubmit(e) {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) return setError('Give the stage a name');
    if (name.length > 40) return setError('Keep the name under 40 characters');
    try {
      if (stage) await update.mutateAsync({ id: stage._id, ...values, name });
      else await add.mutateAsync({ ...values, name });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={stage ? 'Edit stage' : 'Add a stage'}
      description="Every stage rolls up into a status, which drives Kanban columns, filters and completion."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stage-form" loading={add.isPending || update.isPending}>
            {stage ? 'Save' : 'Add stage'}
          </Button>
        </>
      }
    >
      <form id="stage-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Name" data-autofocus value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} error={error} maxLength={40} placeholder="e.g. QA, Blocked, Ready to ship" />
        <Select
          label="Counts as"
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          hint={values.category === 'done' ? 'Tasks moved here are completed and their SLA clock stops.' : undefined}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="label">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {STAGE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Colour ${color}`}
                aria-pressed={values.color === color}
                onClick={() => setValues((v) => ({ ...v, color }))}
                className={cn('grid h-7 w-7 place-items-center rounded-[4px] ring-offset-2 ring-offset-paper-50 transition', values.color === color && 'ring-2 ring-ink-900')}
                style={{ backgroundColor: color }}
              >
                {values.color === color && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}

/**
 * Deleting a stage never loses tasks: if the stage has tasks, the user must pick where they go.
 * The server enforces the same rule (409 without ?moveTo=).
 */
export function DeleteStageDialog({ open, onClose, stage, stages, taskCount }) {
  const remove = useDeleteStage();
  const others = stages.filter((s) => s._id !== stage?._id);
  const [moveTo, setMoveTo] = useState('');

  useEffect(() => {
    if (open) setMoveTo(others.find((s) => s.category === stage?.category)?._id ?? others[0]?._id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage?._id]);

  const lastOfCategory = stage && !others.some((s) => s.category === stage.category);

  async function onConfirm() {
    try {
      await remove.mutateAsync({ id: stage._id, moveTo: taskCount > 0 ? moveTo : undefined });
      onClose();
    } catch {
      /* toast already shown */
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={`Delete "${stage?.name}"?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={remove.isPending} disabled={lastOfCategory || (taskCount > 0 && !moveTo)}>
            {taskCount > 0 ? `Move ${pluralize(taskCount, 'task')} & delete` : 'Delete stage'}
          </Button>
        </>
      }
    >
      {lastOfCategory ? (
        <p className="flex gap-2 border-l-2 border-warn-500 bg-warn-50 px-3 py-2.5 text-[13px] text-ink-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
          This is your only &ldquo;{STATUSES.find((s) => s.value === stage.category)?.label}&rdquo; stage. Add another one first — every workflow needs at least one stage per status.
        </p>
      ) : taskCount > 0 ? (
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink-600">
            This stage still has <b>{pluralize(taskCount, 'task')}</b>. Choose where to move them — their history is kept and the move is recorded in each task&apos;s timeline.
          </p>
          <Select label="Move tasks to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            {others.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-600">The stage is empty, so no tasks are affected. Past time spent in it stays in task histories.</p>
      )}
    </Dialog>
  );
}
