import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { AuthLayout } from '../features/auth/AuthLayout.jsx';
import { PasswordInput } from '../features/auth/PasswordInput.jsx';
import { loginSchema, validateForm } from '../features/auth/schemas.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

export default function LoginPage() {
  useDocumentMeta({ title: 'Sign in', noindex: true });
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validateForm(loginSchema, values);
    setErrors(fieldErrors);
    if (!data) return;
    try {
      // On success the GuestRoute redirects to the page the user originally asked for.
      const user = await login.mutateAsync(data);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to Flowboard?{' '}
          <Link to="/register" className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="border-l-2 border-bad-500 bg-bad-50 px-3 py-2.5 text-[13px] text-ink-800">
            {formError}
          </div>
        )}
        <Input label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="you@company.com" />
        <div>
          <PasswordInput autoComplete="current-password" value={values.password} onChange={set('password')} error={errors.password} placeholder="••••••••" />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 border-t border-dashed border-ink-300 pt-4 text-[13px] text-ink-600">
          <p className="eyebrow">Local demo account</p>
          <p className="mt-1.5">
            Run <code className="kbd">npm run seed</code> in <code className="kbd">server/</code>, then sign in as <span className="font-medium">demo@flowboard.dev</span>.
          </p>
          <button
            type="button"
            className="mt-2 rounded-sm text-[13px] font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900"
            onClick={() => setValues({ email: 'demo@flowboard.dev', password: 'Demo@12345' })}
          >
            Fill demo credentials
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
