import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button.jsx';
import { AuthLayout } from '../features/auth/AuthLayout.jsx';
import { PasswordInput, PasswordStrength } from '../features/auth/PasswordInput.jsx';
import { resetSchema, validateForm } from '../features/auth/schemas.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { authApi } from '../services/endpoints.js';

export default function ResetPasswordPage() {
  useDocumentMeta({ title: 'Choose a new password', noindex: true });
  const navigate = useNavigate();
  // Read the token once, then remove it from the address bar so it isn't left in history or leaked via Referer.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const reset = useMutation({ mutationFn: authApi.resetPassword });

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validateForm(resetSchema, values);
    setErrors(fieldErrors);
    if (!data) return;
    try {
      const res = await reset.mutateAsync({ token, password: data.password });
      toast.success(res.message);
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link missing or invalid" subtitle="Request a new password reset link to continue.">
        <Button size="lg" className="w-full" onClick={() => navigate('/forgot-password')}>
          Request a new link
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="You'll be signed out everywhere else once it's changed.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="border-l-2 border-bad-500 bg-bad-50 px-3 py-2.5 text-[13px] text-ink-800">
            {formError}{' '}
            <Link to="/forgot-password" className="font-medium underline underline-offset-4">
              Request a new link
            </Link>
          </div>
        )}
        <div>
          <PasswordInput label="New password" autoComplete="new-password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} error={errors.password} />
          <PasswordStrength password={values.password} />
        </div>
        <PasswordInput label="Confirm password" autoComplete="new-password" value={values.confirm} onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
