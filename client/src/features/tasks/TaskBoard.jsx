import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn.js';
import { DraggableTaskCard, TaskCardView } from './TaskCard.jsx';

// Mouse/touch: the column under the pointer wins. Keyboard drags have no pointer, so fall back to overlap.
const collisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/**
 * A lane, not a box: columns are separated by thin rules and only the drop target gets a tint.
 * `column.marker` renders before the title (status glyph or stage number), `meta` under it (stage metrics).
 */
function Column({ column, tasks, onOpen, onAdd, header, meta, stretch, first }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { column } });
  return (
    <section
      aria-label={`${column.title}, ${tasks.length} tasks`}
      className={cn(
        'flex shrink-0 flex-col transition-colors duration-150',
        !first && 'border-l border-ink-200',
        isOver && 'bg-ink-900/[0.035]',
        stretch ? 'w-[290px] xl:w-auto xl:min-w-[290px] xl:flex-1' : 'w-[290px]',
      )}
    >
      <header className={cn('border-t-2 px-3 pb-3 pt-3', isOver ? 'border-brand-500' : 'border-transparent')}>
        <div className="flex items-center gap-2">
          {column.marker}
          <h2 className="truncate text-[13.5px] font-semibold text-ink-900">{column.title}</h2>
          <span className="font-mono text-[11.5px] text-ink-400">{tasks.length}</span>
          <div className="ml-auto flex items-center">
            {header}
            {onAdd && (
              <button onClick={() => onAdd(column)} className="rounded-md p-1 text-ink-400 hover:bg-ink-900/5 hover:text-ink-800" aria-label={`Add task to ${column.title}`}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
        {meta && <div className="mt-1.5">{meta}</div>}
      </header>
      <div ref={setNodeRef} className="scrollbar-thin flex min-h-[160px] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-4 lg:max-h-[calc(100vh-300px)]">
        {tasks.map((task) => (
          <DraggableTaskCard key={task._id} task={task} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <div className={cn('flex flex-1 items-start justify-center border border-dashed py-8 text-[12px]', isOver ? 'border-brand-400 text-ink-700' : 'border-ink-200 text-ink-400')}>
            Drop here
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Generic drag-and-drop board used by both Kanban (columns = status) and Pipeline (columns = stages).
 *   columns: [{ id, title, marker? }]
 *   getColumnId(task): which column a task belongs to
 *   onMove(task, columnId): called when a card is dropped on a different column
 */
export function TaskBoard({ columns, tasks, getColumnId, onMove, onOpen, onAdd, renderHeader, renderMeta, trailing, stretch = false }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // small move needed, so clicks still click
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), // press-and-hold on touch, so scrolling still works
    useSensor(KeyboardSensor),
  );

  const byColumn = new Map(columns.map((c) => [c.id, []]));
  for (const task of tasks) byColumn.get(getColumnId(task))?.push(task);
  const titleOf = (id) => columns.find((c) => c.id === id)?.title ?? 'column';

  // Screen-reader announcements for keyboard drag and drop.
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${active.data.current?.task.title}. Use arrow keys to move between columns, space to drop.`,
    onDragOver: ({ over }) => (over ? `Over ${titleOf(over.id)}.` : 'Not over a column.'),
    onDragEnd: ({ active, over }) => (over ? `Moved ${active.data.current?.task.title} to ${titleOf(over.id)}.` : 'Dropped. No change.'),
    onDragCancel: () => 'Move cancelled.',
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={({ active }) => setActiveTask(active.data.current?.task ?? null)}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={({ active, over }) => {
        setActiveTask(null);
        const task = active.data.current?.task;
        if (!task || !over || over.id === getColumnId(task)) return;
        onMove(task, over.id);
      }}
    >
      {/* Horizontal scroll on smaller screens; columns keep a fixed, readable width. */}
      <div className="scrollbar-thin -mx-4 flex overflow-x-auto border-y border-ink-200 px-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        {columns.map((column, i) => (
          <Column
            key={column.id}
            first={i === 0}
            column={column}
            tasks={byColumn.get(column.id)}
            onOpen={onOpen}
            onAdd={onAdd}
            header={renderHeader?.(column)}
            meta={renderMeta?.(column, byColumn.get(column.id))}
            stretch={stretch}
          />
        ))}
        {trailing}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeTask ? <TaskCardView task={activeTask} overlay className="w-[274px] rotate-[0.6deg]" /> : null}
      </DragOverlay>
    </DndContext>
  );
}
