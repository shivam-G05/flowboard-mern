import { motion } from 'framer-motion';
import { cn } from '../../utils/cn.js';

/**
 * Empty states say what's missing and what to do next — no decorative illustration.
 * `hint` is an optional line of practical guidance (e.g. a keyboard shortcut).
 */
export function EmptyState({ icon: Icon, title, description, action, hint, className }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex flex-col items-start px-6 py-12 sm:items-center sm:text-center', className)}
    >
      {Icon && (
        <span className="mb-4 grid h-9 w-9 place-items-center rounded-md border border-ink-200 text-ink-500">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
        </span>
      )}
      <h3 className="font-display text-[22px] leading-tight text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
      {hint && <p className="mt-4 text-[12px] text-ink-400">{hint}</p>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div role="alert" className={cn('border-l-2 border-bad-500 bg-bad-50/60 px-5 py-4', className)}>
      <p className="text-[13.5px] font-medium text-ink-900">Couldn&apos;t load this.</p>
      <p className="mt-0.5 text-[13px] text-ink-600">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-sm text-[13px] font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
          Try again
        </button>
      )}
    </div>
  );
}
