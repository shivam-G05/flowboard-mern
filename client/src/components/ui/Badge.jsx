import { cn } from '../../utils/cn.js';

/** Quiet inline label: a small coloured mark plus text, no pill background by default. */
export function Badge({ className, children, dot, ...props }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium', className ?? 'text-ink-600')} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden />}
      {children}
    </span>
  );
}
