import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/layout/Logo.jsx';

const PRINCIPLES = [
  ['01', 'One source of truth', 'List, board and pipeline read the same tasks and share the same filters.'],
  ['02', 'Deadlines and SLAs, kept apart', 'A due date is a promise you set. An SLA is how long work is allowed to take.'],
  ['03', 'Numbers from what happened', 'Time in each stage comes from recorded transitions, not estimates.'],
];

/** Form on the left; an editorial statement of what the product is for on the right (hidden on small screens). */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-paper-100 lg:grid-cols-[1fr_minmax(0,520px)]">
      <main className="flex flex-col px-6 py-7 sm:px-12">
        <Link to="/" className="w-fit rounded-sm">
          <Wordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-12">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }} className="w-full max-w-[380px]">
            <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink-900">{title}</h1>
            {subtitle && <p className="mt-2 text-[14.5px] text-ink-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-ink-200 pt-5 text-[13.5px] text-ink-500">{footer}</div>}
          </motion.div>
        </div>
      </main>

      <aside className="hidden flex-col justify-between border-l border-ink-200 bg-paper-200/70 px-12 py-12 lg:flex" aria-label="About Flowboard">
        <p className="eyebrow">Task management · Workflows · SLAs</p>
        <div>
          <p className="font-display text-[42px] leading-[1.08] tracking-[-0.01em] text-ink-900">
            Every task has a clock. <span className="italic text-ink-500">Flowboard shows you which ones are running out.</span>
          </p>
          <ol className="mt-12 divide-y divide-ink-300 border-y border-ink-300">
            {PRINCIPLES.map(([n, title, body]) => (
              <li key={n} className="grid grid-cols-[36px_1fr] gap-3 py-4">
                <span className="font-mono text-[11.5px] text-brand-600">{n}</span>
                <span>
                  <span className="block text-[13.5px] font-medium text-ink-900">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-600">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
