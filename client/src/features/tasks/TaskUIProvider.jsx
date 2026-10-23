import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { useDeleteTask } from './queries.js';
import { TaskDetailDrawer } from './TaskDetailDrawer.jsx';
import { TaskFormModal } from './TaskForm.jsx';

const TaskUIContext = createContext(null);

/**
 * Owns the task dialogs so any page can open them:
 *   openCreate(defaults) · openEdit(task) · openTask(id) · confirmDelete(task)
 * The detail drawer is driven by ?task=<id> in the URL, so a task link can be shared or refreshed.
 */
export function TaskUIProvider({ children }) {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ open: false, task: null, defaults: null });
  const [toDelete, setToDelete] = useState(null);
  const deleteTask = useDeleteTask();
  const openTaskId = params.get('task');

  const openTask = useCallback(
    (id) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('task', id);
        return next;
      }),
    [setParams],
  );

  const closeTask = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('task');
        return next;
      }),
    [setParams],
  );

  const value = useMemo(
    () => ({
      openCreate: (defaults = null) => setForm({ open: true, task: null, defaults }),
      openEdit: (task) => setForm({ open: true, task, defaults: null }),
      openTask,
      closeTask,
      confirmDelete: (task) => setToDelete(task),
    }),
    [openTask, closeTask],
  );

  async function handleDelete() {
    await deleteTask.mutateAsync(toDelete._id).catch(() => {});
    if (openTaskId === toDelete._id) closeTask();
    setToDelete(null);
  }

  return (
    <TaskUIContext.Provider value={value}>
      {children}
      <TaskFormModal open={form.open} task={form.task} defaults={form.defaults} onClose={() => setForm((f) => ({ ...f, open: false }))} />
      <TaskDetailDrawer taskId={openTaskId} onClose={closeTask} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleteTask.isPending}
        title="Delete this task?"
        description={
          <>
            &ldquo;{toDelete?.title}&rdquo; will be permanently removed. Its activity history is kept in your feed.
          </>
        }
      />
    </TaskUIContext.Provider>
  );
}

export function useTaskUI() {
  const ctx = useContext(TaskUIContext);
  if (!ctx) throw new Error('useTaskUI must be used inside <TaskUIProvider>');
  return ctx;
}
