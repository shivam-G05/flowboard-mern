import { Skeleton } from '../../components/ui/Skeleton.jsx';

export function BoardSkeleton({ columns = 4 }) {
  return (
    <div className="flex overflow-hidden border-y border-ink-200" aria-busy="true" aria-label="Loading board">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className={`w-[290px] shrink-0 space-y-2 px-2 py-3 ${i ? 'border-l border-ink-200' : ''}`}>
          <Skeleton className="mx-1 mb-3 h-4 w-28" />
          {Array.from({ length: 3 - (i % 2) }, (_, j) => (
            <Skeleton key={j} className="h-[72px] w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Board views load up to 500 cards; say so honestly if there are more. */
export function BoardNotice({ meta, shown }) {
  const total = meta?.pagination?.total ?? 0;
  if (total <= shown) return null;
  return (
    <p className="mb-3 border-l-2 border-warn-500 pl-3 text-[13px] text-ink-700">
      Showing {shown} of {total} matching tasks. Narrow the filters or use the list view to see everything.
    </p>
  );
}
