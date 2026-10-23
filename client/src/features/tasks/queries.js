import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi, workflowApi } from '../../services/endpoints.js';

/*
 * Server state lives in React Query's cache, keyed like this:
 *   ['tasks', 'list', params]   one page of the list view
 *   ['tasks', 'board', filters] all cards for Kanban / pipeline (up to 500)
 *   ['task', id]                one task's detail      ['task', id, 'activity'] its timeline
 *   ['workflow']                the user's stages      ['workflow', 'stats'] per-stage analytics
 *   ['dashboard']               dashboard summary
 * After a successful write we invalidate the affected keys and React Query refetches what is on screen.
 */

export const BOARD_LIMIT = 500;

export function useTaskList(params) {
  return useQuery({
    queryKey: ['tasks', 'list', params],
    queryFn: ({ signal }) => tasksApi.list(params, signal),
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  });
}

export function useBoardTasks(filterParams) {
  return useQuery({
    queryKey: ['tasks', 'board', filterParams],
    queryFn: ({ signal }) => tasksApi.list({ ...filterParams, sort: 'priority', order: 'desc', limit: BOARD_LIMIT }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useTask(id) {
  return useQuery({ queryKey: ['task', id], queryFn: () => tasksApi.get(id), enabled: !!id });
}

export function useTaskActivity(id) {
  return useQuery({ queryKey: ['task', id, 'activity'], queryFn: () => tasksApi.activity(id), enabled: !!id });
}

export function useWorkflow() {
  return useQuery({ queryKey: ['workflow'], queryFn: workflowApi.get, staleTime: 60_000 });
}

export function useStageStats() {
  return useQuery({ queryKey: ['workflow', 'stats'], queryFn: workflowApi.stats });
}

/** Everything that can change when a task changes. */
function useInvalidateTaskData() {
  const qc = useQueryClient();
  return (taskId) => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['workflow', 'stats'] });
    if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
  };
}

function useTaskMutation(mutationFn, { success, getId } = {}) {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (success) toast.success(typeof success === 'function' ? success(data, variables) : success);
    },
    onError: (err) => toast.error(err.message),
    onSettled: (_data, _err, variables) => invalidate(getId?.(variables)),
  });
}

export const useCreateTask = () => useTaskMutation(tasksApi.create, { success: 'Task created' });
export const useUpdateTask = () =>
  useTaskMutation(({ id, ...body }) => tasksApi.update(id, body), { success: 'Changes saved', getId: (v) => v.id });
export const useQuickUpdateTask = () => useTaskMutation(({ id, ...body }) => tasksApi.update(id, body), { getId: (v) => v.id });
export const useCompleteTask = () => useTaskMutation(tasksApi.complete, { success: 'Marked as done', getId: (id) => id });
export const useDuplicateTask = () => useTaskMutation(tasksApi.duplicate, { success: 'Task duplicated' });
export const useDeleteTask = () => useTaskMutation(tasksApi.remove, { success: 'Task deleted', getId: (id) => id });
export const useBulkUpdate = () => useTaskMutation(tasksApi.bulkUpdate, { success: (d) => `Updated ${d.updated} task(s)` });
export const useBulkDelete = () => useTaskMutation(tasksApi.bulkDelete, { success: (d) => `Deleted ${d.deleted} task(s)` });

/**
 * Drag-and-drop move with an optimistic update:
 *   1. onMutate  – cancel in-flight board fetches, snapshot the cache, move the card immediately
 *   2. mutationFn – PATCH /api/tasks/:id/move persists it
 *   3. onError   – put every snapshot back (rollback) and show a toast
 *   4. onSettled – refetch so the board matches the database exactly
 */
export function useMoveTask() {
  const qc = useQueryClient();
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({ id, stageId, status }) => tasksApi.move(id, stageId ? { stageId } : { status }),
    onMutate: async ({ id, stageId, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks', 'board'] });
      const snapshots = qc.getQueriesData({ queryKey: ['tasks', 'board'] });
      const stages = qc.getQueryData(['workflow'])?.stages ?? [];
      const target = stageId ? stages.find((s) => s._id === stageId) : stages.find((s) => s.category === status);

      qc.setQueriesData({ queryKey: ['tasks', 'board'] }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((t) => {
                if (t._id !== id) return t;
                // Kanban: a card already in this status column stays in its current stage.
                if (!stageId && t.status === status) return t;
                return { ...t, stage: target?._id ?? t.stage, status: target?.category ?? status ?? t.status, timeInStageMs: 0 };
              }),
            }
          : old,
      );
      return { snapshots };
    },
    onError: (err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(`Couldn't move the task: ${err.message}`);
    },
    onSettled: (_data, _err, { id }) => invalidate(id),
  });
}
