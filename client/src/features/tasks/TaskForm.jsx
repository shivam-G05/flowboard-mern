import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { PRIORITIES, SLA_PRESETS } from '../../utils/constants.js';
import { fromDateTimeInput, toDateTimeInput } from '../../utils/format.js';
import { validateForm } from '../auth/schemas.js';
import { useCreateTask, useUpdateTask, useWorkflow } from './queries.js';

const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10000), 'Enter a number between 0 and 10000');

// Same rules as the server's createTaskSchema, expressed for form values (strings).
const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the task a title').max(140, 'Keep the title under 140 characters'),
    description: z.string().max(5000, 'Description is too long'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    stageId: z.string().min(1, 'Choose a stage'),
    startDate: z.string(),
    dueDate: z.string(),
    estimatedHours: optionalNumber,
    slaHours: optionalNumber,
    assignee: z.string().max(60),
  })
  .refine((v) => !v.startDate || !v.dueDate || new Date(v.dueDate) >= new Date(v.startDate), {
    message: 'Due date cannot be before the start date',
    path: ['dueDate'],
  });

function initialValues(task, defaults, stages) {
  const slaHours = task?.slaHours ?? defaults?.slaHours ?? 24;
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? defaults?.priority ?? 'medium',
    stageId:
      task?.stage ??
      defaults?.stageId ??
      (defaults?.status && stages?.find((s) => s.category === defaults.status)?._id) ??
      stages?.[1]?._id ??
      stages?.[0]?._id ??
      '',
    startDate: toDateTimeInput(task?.startDate),
    dueDate: toDateTimeInput(task?.dueDate),
    estimatedHours: task?.estimatedHours != null ? String(task.estimatedHours) : '',
    slaHours: slaHours != null ? String(slaHours) : '',
    assignee: task?.assignee ?? '',
    tags: task?.tags ?? [],
  };
}

/** Create and edit share this one form. `task` present = edit mode. */
export function TaskFormModal({ open, onClose, task, defaults }) {
  const { data: workflow } = useWorkflow();
  const stages = workflow?.stages ?? [];
  const create = useCreateTask();
  const update = useUpdateTask();
  const [values, setValues] = useState(() => initialValues(task, defaults, stages));
  const [initial, setInitial] = useState(values);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const isEdit = !!task;

  // Reset the form every time it opens (for a different task or a new one).
  useEffect(() => {
    if (open) {
      const start = initialValues(task, defaults, stages);
      setValues(start);
      setInitial(start);
      setErrors({});
      setTagInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?._id]);

  // Stages may load after the dialog opens.
  // (Functional update: it must see the values the reset effect above just set, not this render's.)
  useEffect(() => {
    if (open && stages.length) setValues((v) => (v.stageId ? v : { ...v, stageId: initialValues(task, defaults, stages).stageId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stages]);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().slice(0, 30);
    if (!tag || values.tags.includes(tag) || values.tags.length >= 10) return;
    setValues((v) => ({ ...v, tags: [...v.tags, tag] }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const { data, errors: fieldErrors } = validateForm(taskFormSchema, values);
    setErrors(fieldErrors);
    if (!data) return;

    const body = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      stageId: data.stageId,
      startDate: fromDateTimeInput(data.startDate),
      dueDate: fromDateTimeInput(data.dueDate),
      estimatedHours: data.estimatedHours === '' ? null : Number(data.estimatedHours),
      slaHours: data.slaHours === '' ? null : Number(data.slaHours),
      assignee: data.assignee.trim() || null,
      tags: values.tags,
    };

    // When editing, send only what the user actually changed so the timeline stays accurate.
    if (isEdit) {
      for (const key of Object.keys(body)) {
        if (JSON.stringify(values[key]) === JSON.stringify(initial[key])) delete body[key];
      }
      if (!Object.keys(body).length) return onClose();
    }

    try {
      if (isEdit) await update.mutateAsync({ id: task._id, ...body });
      else await create.mutateAsync(body);
      onClose();
    } catch (err) {
      const serverErrors = Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]));
      setErrors(serverErrors);
    }
  }

  const saving = create.isPending || update.isPending;
  const slaIsPreset = SLA_PRESETS.some((p) => String(p.value) === values.slaHours);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit task' : 'New task'}
      description={isEdit ? 'Changes are recorded in the task timeline.' : 'Capture the work, set a deadline and an SLA target.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          className="sm:col-span-2"
          label="Title"
          required
          data-autofocus
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="What needs to happen?"
          maxLength={140}
          inputClassName="h-12 rounded-none border-0 border-b border-ink-300 bg-transparent px-0 font-display text-[24px] hover:border-ink-500 focus:border-ink-900 focus-visible:ring-0"
        />
        <Textarea className="sm:col-span-2" label="Description" value={values.description} onChange={set('description')} error={errors.description} placeholder="Context, acceptance criteria, links…" rows={3} />

        <Select label="Priority" value={values.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select label="Stage" value={values.stageId} onChange={set('stageId')} error={errors.stageId}>
          {stages.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input label="Start date" type="datetime-local" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
        <Input label="Due date" type="datetime-local" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} hint="Overdue once this passes." />

        <div>
          <Select
            label="SLA target"
            value={slaIsPreset || values.slaHours === '' ? values.slaHours : 'custom'}
            onChange={(e) => setValues((v) => ({ ...v, slaHours: e.target.value === 'custom' ? '12' : e.target.value }))}
            hint="Time allowed from creation to done."
          >
            <option value="">No SLA</option>
            {SLA_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </Select>
          {!slaIsPreset && values.slaHours !== '' && (
            <Input className="mt-2" label="Custom SLA (hours)" type="number" min={0} step="0.5" value={values.slaHours} onChange={set('slaHours')} error={errors.slaHours} />
          )}
        </div>
        <Input label="Estimate (hours)" type="number" min={0} step="0.5" value={values.estimatedHours} onChange={set('estimatedHours')} error={errors.estimatedHours} placeholder="Optional" />

        <Input label="Assignee" value={values.assignee} onChange={set('assignee')} error={errors.assignee} placeholder="Optional" maxLength={60} />
        <div>
          <label className="label" htmlFor="tag-input">
            Tags
          </label>
          <div className="field flex h-auto min-h-[36px] flex-wrap items-center gap-1.5 py-1">
            {values.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-[3px] bg-ink-900/[0.06] px-1.5 py-0.5 text-[12px] text-ink-800">
                #{tag}
                <button type="button" aria-label={`Remove tag ${tag}`} className="rounded-sm text-ink-400 hover:text-ink-900" onClick={() => setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                } else if (e.key === 'Backspace' && !tagInput && values.tags.length) {
                  setValues((v) => ({ ...v, tags: v.tags.slice(0, -1) }));
                }
              }}
              onBlur={() => {
                addTag(tagInput);
                setTagInput('');
              }}
              placeholder={values.tags.length ? '' : 'Type and press Enter'}
              className="min-w-[80px] flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-400"
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
