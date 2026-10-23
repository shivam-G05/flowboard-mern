import { useMutation, useQuery } from '@tanstack/react-query';
import { Inbox, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { AuthLayout } from '../features/auth/AuthLayout.jsx';
import { forgotSchema, validateForm } from '../features/auth/schemas.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { api } from '../services/api.js';
import { authApi } from '../services/endpoints.js';
import { timeAgo } from '../utils/format.js';

/**
 * Local development has no email provider, so the server writes reset emails to a dev mailbox.
 * This panel reads it (GET /api/dev/mailbox — a route that does not exist in production builds of the API).
 */
function DevMailbox({ email }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dev-mailbox', email],
    queryFn: () => api.get('/dev/mailbox').then((r) => r.data),
    retry: false,
  });
  const message = data?.find((m) => m.to === email.toLowerCase());
  if (isLoading || isError) return null;

  return (
    <div className="mt-6 border-t border-dashed border-ink-300 pt-4">
      <div className="eyebrow flex items-center gap-2">
        <Inbox className="h-3.5 w-3.5" /> Development mailbox
      </div>
      {message ? (
        <>
          <p className="mt-1 text-[13px] text-ink-600">
            &ldquo;{message.subject}&rdquo; · {timeAgo(message.sentAt)}
          </p>
          <a href={message.actionUrl} className="mt-3 inline-flex rounded-sm text-[13.5px] font-medium text-ink-900 underline decoration-brand-500 underline-offset-4">
            Open reset link
          </a>
        </>
      ) : (
        <p className="mt-1 text-[13px] text-ink-600">No email for this address — that account may not exist (the API doesn&apos;t reveal which).</p>
      )}
      <p className="mt-3 text-xs text-ink-500">Shown only in development. In production, the email is sent by a real provider.</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  useDocumentMeta({ title: 'Reset your password', noindex: true });
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const request = useMutation({ mutationFn: authApi.forgotPassword });

  async function onSubmit(e) {
    e.preventDefault();
    const { data, errors } = validateForm(forgotSchema, { email });
    setError(errors.email ?? '');
    if (data) request.mutate(data, { onError: (err) => setError(err.message) });
  }

  if (request.isSuccess) {
    return (
      <AuthLayout title="Check your inbox" footer={<Link to="/login" className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">Back to sign in</Link>}>
        <div className="flex gap-3 border-l-2 border-good-500 bg-good-50 px-3 py-3 text-[13.5px] text-ink-800">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-good-600" />
          <p>{request.data.message} The link expires in 15 minutes and works once.</p>
        </div>
        {import.meta.env.DEV && <DevMailbox email={email} />}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a secure link to choose a new one."
      footer={
        <Link to="/login" className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} placeholder="you@company.com" />
        <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
