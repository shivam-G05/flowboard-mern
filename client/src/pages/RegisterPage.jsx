import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { AuthLayout } from '../features/auth/AuthLayout.jsx';
import { PasswordInput, PasswordStrength } from '../features/auth/PasswordInput.jsx';
import { registerSchema, validateForm } from '../features/auth/schemas.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

export default function RegisterPage() {
  useDocumentMeta({ title: 'Create your account', noindex: true });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validateForm(registerSchema, values);
    setErrors(fieldErrors);
    if (!data) return;
    try {
      await register.mutateAsync(data);
      toast.success('Your workspace is ready');
      navigate('/app', { replace: true });
    } catch (err) {
      // Map server-side field errors back onto the form when present.
      const serverErrors = Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]));
      if (Object.keys(serverErrors).length) setErrors(serverErrors);
      else setFormError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free, private to you, and ready in seconds."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
            Sign in
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
        <Input label="Full name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Ada Lovelace" />
        <Input label="Work email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="you@company.com" />
        <div>
          <PasswordInput
            autoComplete="new-password"
            value={values.password}
            onChange={set('password')}
            error={errors.password}
            hint={!errors.password ? 'At least 8 characters, with a letter and a number.' : undefined}
          />
          <PasswordStrength password={values.password} />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
