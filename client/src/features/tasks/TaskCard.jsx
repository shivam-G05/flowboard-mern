import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { forwardRef, memo } from 'react';
import { cn } from '../../utils/cn.js';
import { formatDuration } from '../../utils/format.js';
import { TaskActionsMenu } from './TaskActionsMenu.jsx';
import { DueDate, PriorityIcon, SlaBadge } from './TaskBadges.jsx';

// Space/Enter on inner buttons must not start a keyboard drag; other keys (shortcuts) still bubble.
const stopDragKeys = (e) => {
  if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
};

function Initials({ name }) {
  if (!name) return null;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span title={name} className="grid h-5 w-5 place-items-center rounded-full bg-ink-200 font-mono text-[9.5px] font-medium text-ink-700">
      {initials}
    </span>
  );
}

/** Compact, flat card. Used in columns and as the floating drag overlay (the only place it casts a shadow). */
export const TaskCardView = forwardRef(function TaskCardView({ task, dragging = false, overlay = false, onOpen, className, ...rest }, ref) {
  const done = task.status === 'done';
  return (
    <div
      ref={ref}
      className={cn(
        'group relative rounded-md border bg-paper-50 py-2.5 pl-6 pr-2.5 text-left transition-[border-color,opacity,background-color] duration-150',
        task.isOverdue ? 'border-bad-500/40' : 'border-ink-200',
        !overlay && 'hover:border-ink-400',
        dragging && 'opacity-30',
        overlay && 'cursor-grabbing border-ink-400 shadow-lift',
        className,
      )}
      {...rest}
    >
      {/* Drag affordance; the whole card is draggable, the grip makes that visible. */}
      <GripVertical
        className={cn('absolute left-1 top-2.5 h-4 w-4 text-ink-300 transition-opacity', overlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')}
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.(task._id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={stopDragKeys}
          className={cn(
            'line-clamp-2 min-w-0 flex-1 break-words rounded-sm text-left text-[13.5px] font-medium leading-snug text-ink-900 hover:underline hover:decoration-ink-300 hover:underline-offset-2',
            done && 'text-ink-500 line-through decoration-ink-300',
          )}
          title={task.title}
        >
          {task.title}
        </button>
        {!overlay && (
          <div className="-mr-1 -mt-0.5 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()} onKeyDown={stopDragKeys}>
            <TaskActionsMenu task={task} />
          </div>
        )}
      </div>

      {task.tags?.length > 0 && <p className="mt-1 truncate text-[11.5px] text-ink-400">{task.tags.slice(0, 3).map((t) => `#${t}`).join('  ')}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <PriorityIcon priority={task.priority} />
        {task.dueDate && <DueDate value={task.dueDate} overdue={task.isOverdue} done={done} />}
        <SlaBadge sla={task.sla} compact />
        <span className="ml-auto flex items-center gap-2">
          {task.timeInStageMs != null && !done && (
            <span className="whitespace-nowrap font-mono text-[11px] text-ink-400" title="Time in current stage">
              {formatDuration(task.timeInStageMs)}
            </span>
          )}
          <Initials name={task.assignee} />
        </span>
      </div>
    </div>
  );
});

/** Draggable wrapper. dnd-kit supplies pointer, touch and keyboard (Space to lift, arrows to move) dragging. */
export const DraggableTaskCard = memo(function DraggableTaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id, data: { task } });
  return (
    <motion.div layout="position" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
      <TaskCardView
        ref={setNodeRef}
        task={task}
        dragging={isDragging}
        onOpen={onOpen}
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label={`${task.title}. Priority ${task.priority}. Press space to pick up and move.`}
        {...attributes}
        {...listeners}
      />
    </motion.div>
  );
});
