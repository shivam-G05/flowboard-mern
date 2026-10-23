import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { Field } from '../../components/ui/Field.jsx';
import { cn } from '../../utils/cn.js';

/** Password field with a show/hide toggle. */
export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', error, hint, className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <div className="relative">
          <input ref={ref} type={visible ? 'text' : 'password'} className={cn('field pr-11', error && 'field-error')} {...a11y} {...props} />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 hover:text-ink-800"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )}
    </Field>
  );
});

/** Four-segment strength hint based on the same rules the server enforces, plus length/variety. */
export function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score += 1;
  const labels = ['Too weak', 'Weak', 'Good', 'Strong', 'Excellent'];
  const colors = ['bg-bad-500', 'bg-bad-500', 'bg-warn-500', 'bg-good-500', 'bg-good-600'];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn('h-[3px] flex-1 transition-colors', i < score ? colors[score] : 'bg-ink-200')} />
        ))}
      </div>
      <p className="mt-1 font-mono text-[11px] text-ink-500">{labels[score]}</p>
    </div>
  );
}
