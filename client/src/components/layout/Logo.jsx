import { cn } from '../../utils/cn.js';

/** Mark: three stacked bars of decreasing length — work narrowing toward done. The last one carries the accent. */
export function Logo({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-6 w-6', className)} aria-hidden>
      <rect width="32" height="32" rx="6" fill="#1C1B18" />
      <rect x="8" y="9" width="16" height="3" fill="#F7F5F0" />
      <rect x="8" y="15" width="11" height="3" fill="#F7F5F0" />
      <rect x="8" y="21" width="6" height="3" fill="#D4552F" />
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Logo />
      <span className="font-display text-[22px] leading-none tracking-[-0.01em] text-ink-900">Flowboard</span>
    </span>
  );
}
