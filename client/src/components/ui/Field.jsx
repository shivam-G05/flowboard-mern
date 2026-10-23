import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

/** Label + control + hint/error, wired together with ids so screen readers announce them. */
export function Field({ label, error, hint, children, className, required }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && (
            <span className="ml-0.5 text-brand-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] text-bad-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, className, inputClassName, required, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} className={className} required={required}>
      {(a11y) => <input ref={ref} className={cn('field', error && 'field-error', inputClassName)} required={required} {...a11y} {...props} />}
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => <textarea ref={ref} className={cn('field min-h-[88px] resize-y leading-relaxed', error && 'field-error')} {...a11y} {...props} />}
    </Field>
  );
});

const CHEVRON =
  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378736A' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")";

export const Select = forwardRef(function Select({ label, error, hint, className, selectClassName, children, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <select
          ref={ref}
          className={cn('field cursor-pointer appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9', error && 'field-error', selectClassName)}
          style={{ backgroundImage: CHEVRON }}
          {...a11y}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
});
