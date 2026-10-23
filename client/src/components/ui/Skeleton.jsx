import { cn } from '../../utils/cn.js';

/** Placeholder that keeps the layout stable while data loads. */
export function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-[3px] bg-ink-900/[0.06]',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-paper-50/60 before:to-transparent',
        className,
      )}
    />
  );
}
