import { Link } from 'react-router-dom';
import { Wordmark } from '../components/layout/Logo.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

export default function NotFoundPage() {
  useDocumentMeta({ title: 'Page not found', noindex: true });
  return (
    <main className="flex min-h-screen flex-col bg-paper-100 px-6 py-7 sm:px-12">
      <Link to="/" className="w-fit rounded-sm">
        <Wordmark />
      </Link>
      <div className="flex flex-1 items-center">
        <div className="max-w-xl border-t border-ink-900 pt-6">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-3 font-display text-[56px] leading-none tracking-[-0.02em] text-ink-900">This page isn&apos;t on the board.</h1>
          <p className="mt-4 text-[15px] text-ink-600">The link may be broken, or the page may have moved.</p>
          <LinkButton to="/" className="mt-8">
            Back to home
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
