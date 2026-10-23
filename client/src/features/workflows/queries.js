import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workflowApi } from '../../services/endpoints.js';

/** Stage mutations. The server returns the updated workflow, which we write straight into the cache. */
function useWorkflowMutation(mutationFn, success) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      const workflow = result?.data ?? result; // deleteStage returns the full envelope { data, meta }
      qc.setQueryData(['workflow'], workflow);
      if (success) toast.success(typeof success === 'function' ? success(result, variables) : success);
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['workflow'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export const useAddStage = () => useWorkflowMutation(workflowApi.addStage, (_r, v) => `Stage "${v.name}" added`);
export const useUpdateStage = () => useWorkflowMutation(({ id, ...body }) => workflowApi.updateStage(id, body), 'Stage updated');
export const useDeleteStage = () =>
  useWorkflowMutation(
    ({ id, moveTo }) => workflowApi.deleteStage(id, moveTo),
    (r) => (r.meta?.movedTasks ? `Stage deleted · ${r.meta.movedTasks} task(s) moved` : 'Stage deleted'),
  );

/** Reorder is optimistic: columns move instantly and roll back if the server refuses. */
export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workflowApi.reorder,
    onMutate: async (stageIds) => {
      await qc.cancelQueries({ queryKey: ['workflow'] });
      const previous = qc.getQueryData(['workflow']);
      if (previous) {
        const byId = new Map(previous.stages.map((s) => [s._id, s]));
        qc.setQueryData(['workflow'], { ...previous, stages: stageIds.map((id) => byId.get(id)) });
      }
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['workflow'], ctx.previous);
      toast.error(err.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['workflow'] }),
  });
}
