import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export function Checkbox({ checked, indeterminate, onChange, label, className }) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors',
        on ? 'border-ink-900 bg-ink-900 text-paper-50' : 'border-ink-300 bg-paper-50 hover:border-ink-500',
        className,
      )}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  );
}
