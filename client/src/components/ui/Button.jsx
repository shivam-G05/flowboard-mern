import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

// Flat, solid buttons. The primary action is ink; the accent is reserved for emphasis (`accent`).
const VARIANTS = {
  primary: 'bg-ink-900 text-paper-50 hover:bg-ink-800',
  accent: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'border border-ink-300 bg-paper-50 text-ink-800 hover:border-ink-400 hover:bg-white',
  ghost: 'text-ink-600 hover:bg-ink-900/[0.05] hover:text-ink-900',
  danger: 'bg-bad-500 text-white hover:bg-bad-600',
  'danger-ghost': 'text-bad-600 hover:bg-bad-50',
};

const SIZES = {
  xs: 'h-7 px-2 text-[12.5px] gap-1.5',
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[13.5px] gap-2',
  lg: 'h-11 px-5 text-[14.5px] gap-2',
  icon: 'h-8 w-8',
  'icon-sm': 'h-7 w-7',
};

export function buttonClass({ variant = 'primary', size = 'md', className } = {}) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-45 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** A router link styled as a button (never nest a <button> inside an <a>). */
export function LinkButton({ variant, size, className, ...props }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
