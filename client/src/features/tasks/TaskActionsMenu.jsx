import { CheckCircle2, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Dropdown } from '../../components/ui/Dropdown.jsx';
import { useCompleteTask, useDuplicateTask } from './queries.js';
import { useTaskUI } from './TaskUIProvider.jsx';

export function TaskActionsMenu({ task, showOpen = true }) {
  const ui = useTaskUI();
  const complete = useCompleteTask();
  const duplicate = useDuplicateTask();

  const items = [
    ...(showOpen ? [{ label: 'Open details', icon: Eye, onSelect: () => ui.openTask(task._id) }] : []),
    { label: 'Edit', icon: Pencil, onSelect: () => ui.openEdit(task) },
    { label: 'Duplicate', icon: Copy, onSelect: () => duplicate.mutate(task._id) },
    { label: 'Mark complete', icon: CheckCircle2, disabled: task.status === 'done', onSelect: () => complete.mutate(task._id) },
    { divider: true },
    { label: 'Delete', icon: Trash2, danger: true, onSelect: () => ui.confirmDelete(task) },
  ];

  return (
    <Dropdown
      label={`Actions for ${task.title}`}
      items={items}
      trigger={
        <span className="grid h-6 w-6 place-items-center rounded-[4px] text-ink-400 transition-colors hover:bg-ink-900/[0.06] hover:text-ink-900">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      }
    />
  );
}
