import { Wordmark } from './Logo.jsx';

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper-100" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-5">
        <Wordmark />
        <div className="h-px w-28 overflow-hidden bg-ink-200">
          <div className="h-full w-1/3 animate-progress bg-ink-900" />
        </div>
      </div>
    </div>
  );
}
