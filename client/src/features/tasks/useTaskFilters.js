import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const LIST_KEYS = ['priority', 'status'];
const FILTER_KEYS = ['search', 'priority', 'status', 'sla', 'overdue', 'dueFrom', 'dueTo'];
const DEFAULTS = { sort: 'createdAt', order: 'desc', page: 1, limit: 20 };

/**
 * Filters, sorting and pagination live in the URL (?search=…&priority=high,urgent&page=2).
 * That makes every view shareable/bookmarkable, keeps the back button working, and lets the
 * list, Kanban and pipeline views share the same filters when you switch between them.
 */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const get = (k) => params.get(k) ?? undefined;
    return {
      search: get('search') ?? '',
      priority: params.get('priority')?.split(',').filter(Boolean) ?? [],
      status: params.get('status')?.split(',').filter(Boolean) ?? [],
      sla: get('sla'),
      overdue: get('overdue'),
      dueFrom: get('dueFrom'),
      dueTo: get('dueTo'),
      sort: get('sort') ?? DEFAULTS.sort,
      order: get('order') ?? DEFAULTS.order,
      page: Number(get('page')) || DEFAULTS.page,
      limit: Number(get('limit')) || DEFAULTS.limit,
    };
  }, [params]);

  const setFilters = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
            if (empty || value === DEFAULTS[key]) next.delete(key);
            else next.set(key, LIST_KEYS.includes(key) ? value.join(',') : String(value));
          }
          // Any change other than paging sends you back to page 1.
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        FILTER_KEYS.forEach((k) => next.delete(k));
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  const activeCount = FILTER_KEYS.filter((k) => (Array.isArray(filters[k]) ? filters[k].length : filters[k])).length;

  // Only the filter part (no paging/sorting) — what the board views send to the API.
  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      priority: filters.priority,
      status: filters.status,
      sla: filters.sla,
      overdue: filters.overdue,
      dueFrom: filters.dueFrom,
      dueTo: filters.dueTo,
    }),
    [filters],
  );

  return { filters, filterParams, setFilters, clearFilters, activeCount };
}
