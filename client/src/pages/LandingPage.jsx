import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo, Wordmark } from '../components/layout/Logo.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { PriorityIcon } from '../features/tasks/TaskBadges.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

const FEATURES = [
  ['01', 'Three views, one source of truth', 'A dense list for triage, a board for status, a pipeline for flow. They read the same tasks and share the same filters, so a change in one is a change everywhere.'],
  ['02', 'A workflow that fits your team', 'Add, rename, reorder and retire stages. Removing a stage asks where its work should go — nothing disappears quietly.'],
  ['03', 'SLAs that warn before they break', 'Give a task a time budget. Flowboard marks it at risk once 75% is spent, and keeps that separate from the due date you chose.'],
  ['04', 'Analytics from what actually happened', 'Every move between stages is recorded, so “average time in review” is measured, not guessed.'],
  ['05', 'A history for every task', 'Creation, moves, priority and deadline changes, completion — a timeline you can read in a few seconds.'],
  ['06', 'Private by default', 'Sessions in HTTP-only cookies, bcrypt-hashed passwords, and every query scoped to your account.'],
];

const easeOut = [0.2, 0, 0, 1];

/** A flat, honest sketch of the pipeline view — the real product's structure, drawn in HTML. */
function PipelinePreview() {
  const stages = [
    { n: '01', name: 'To Do', count: 6, color: '#5B6B8C', meta: 'avg 13h · through 31', cards: [['Renew SSL certificates for staging', 'high', 'At risk', 'warn'], ['Design empty states', 'low', null]] },
    { n: '02', name: 'In Progress', count: 10, color: '#B7791F', meta: 'avg 17h · through 21', cards: [['Fix Safari checkout failure', 'urgent', 'Breached', 'bad'], ['Q4 roadmap deck', 'high', 'On track', 'good']] },
    { n: '03', name: 'In Review', count: 3, color: '#6E5B9B', meta: 'avg 6h · through 8', cards: [['Onboarding email sequence', 'medium', 'At risk', 'warn']] },
    { n: '04', name: 'Done', count: 18, color: '#3F7A57', meta: 'lead time 1d 10h', cards: [['Accessibility audit', 'high', 'Met', 'good'], ['Release notes v2.4', 'medium', 'Met', 'good']] },
  ];
  const tone = { warn: 'text-warn-600 bg-warn-500', bad: 'text-bad-600 bg-bad-500', good: 'text-good-600 bg-good-500' };
  return (
    <figure aria-label="Illustration of the pipeline view">
      <div className="grid grid-cols-2 border-y border-ink-300 md:grid-cols-4">
        {stages.map((s, i) => (
          <div key={s.n} className={`${i ? 'border-l border-ink-200' : ''} ${i > 1 ? 'hidden md:block' : ''} px-3 pb-4 pt-3`}>
            <div className="h-[3px] -mx-3 -mt-3 mb-3" style={{ backgroundColor: s.color }} />
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-mono text-[11px] text-ink-400">{s.n}</span>
              <span className="font-semibold text-ink-900">{s.name}</span>
              <span className="font-mono text-[11px] text-ink-400">{s.count}</span>
            </div>
            <p className="mt-1 font-mono text-[10.5px] text-ink-400">{s.meta}</p>
            <div className="mt-3 space-y-1.5">
              {s.cards.map(([title, priority, health, t], j) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 + j * 0.04, duration: 0.3, ease: easeOut }}
                  className="rounded-md border border-ink-200 bg-paper-50 px-2.5 py-2"
                >
                  <p className={`text-[12.5px] font-medium leading-snug ${s.name === 'Done' ? 'text-ink-500 line-through decoration-ink-300' : 'text-ink-900'}`}>{title}</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <PriorityIcon priority={priority} />
                    {health && (
                      <span className={`inline-flex items-center gap-1 text-[11px] ${tone[t].split(' ')[0]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone[t].split(' ')[1]}`} />
                        {health}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 font-mono text-[11px] text-ink-400">Fig. 1 — The pipeline view. Figures under each stage are computed from recorded transitions.</figcaption>
    </figure>
  );
}

/** The SLA model drawn as a ruler: on track until 75%, at risk until 100%, breached after. */
function SlaRuler() {
  return (
    <div aria-label="SLA timeline: on track until 75 percent of the target, at risk until 100 percent, breached after" role="img">
      <div className="flex h-2">
        <div className="w-[60%] bg-good-500" />
        <div className="w-[20%] bg-warn-500" />
        <div className="w-[20%] bg-bad-500" />
      </div>
      <div className="relative mt-2 h-14 font-mono text-[11px] text-ink-500">
        {[
          ['0%', 'created', '0%'],
          ['75%', 'at risk', '60%'],
          ['100%', 'target', '80%'],
        ].map(([pct, label, left]) => (
          <div key={pct} className="absolute top-0 -translate-x-px border-l border-ink-500 pl-2" style={{ left }}>
            <span className="block text-ink-900">{pct}</span>
            <span className="block">{label}</span>
          </div>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-ink-200 pt-4 text-[13px]">
        <div>
          <dt className="font-medium text-good-600">On track</dt>
          <dd className="mt-1 text-ink-600">Less than 75% of the time budget used.</dd>
        </div>
        <div>
          <dt className="font-medium text-warn-600">At risk</dt>
          <dd className="mt-1 text-ink-600">Still within target, but most of it is gone.</dd>
        </div>
        <div>
          <dt className="font-medium text-bad-600">Breached</dt>
          <dd className="mt-1 text-ink-600">Took longer than the target allowed.</dd>
        </div>
      </dl>
    </div>
  );
}

export default function LandingPage() {
  useDocumentMeta({
    title: null,
    description: 'Flowboard is a calm, fast task manager with list, Kanban and pipeline views, customizable workflows, SLA tracking and real analytics.',
  });
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-paper-100">
      <header className="border-b border-ink-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="rounded-sm">
            <Wordmark />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1 text-[13.5px]">
            <a href="#features" className="hidden rounded-md px-3 py-1.5 text-ink-600 hover:text-ink-900 sm:block">
              Features
            </a>
            <a href="#sla" className="hidden rounded-md px-3 py-1.5 text-ink-600 hover:text-ink-900 sm:block">
              How SLAs work
            </a>
            {user ? (
              <LinkButton to="/app" size="sm" className="ml-2">
                Open Flowboard
              </LinkButton>
            ) : (
              <>
                <Link to="/login" className="rounded-md px-3 py-1.5 text-ink-700 hover:text-ink-900">
                  Sign in
                </Link>
                <LinkButton to="/register" size="sm" className="ml-1">
                  Get started
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="eyebrow">
            Task management · Custom workflows · SLA tracking
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
            className="mt-6 max-w-4xl text-balance font-display text-[52px] leading-[0.98] tracking-[-0.02em] text-ink-900 sm:text-[84px]"
          >
            Work moves in stages. <span className="italic text-ink-500">Know where it&apos;s stuck.</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: easeOut }}
            className="mt-8 grid gap-8 border-t border-ink-300 pt-6 md:grid-cols-12"
          >
            <p className="text-[17px] leading-relaxed text-ink-600 md:col-span-6">
              Flowboard keeps your tasks, your workflow and your service-level targets in one quiet place — with a list, a board and a pipeline that always agree.
            </p>
            <div className="flex flex-wrap items-start gap-3 md:col-span-6 md:justify-end">
              <LinkButton to={user ? '/app' : '/register'} size="lg">
                {user ? 'Open your dashboard' : 'Create a free workspace'} <ArrowRight />
              </LinkButton>
              {!user && (
                <LinkButton to="/login" size="lg" variant="secondary">
                  Sign in
                </LinkButton>
              )}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <PipelinePreview />
        </section>

        <section id="features" className="border-t border-ink-200 bg-paper-50" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="grid gap-6 md:grid-cols-12">
              <p className="eyebrow md:col-span-3">What it does</p>
              <h2 id="features-heading" className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink-900 md:col-span-9 sm:text-[48px]">
                Built for people who promise deadlines — and like to keep them.
              </h2>
            </div>
            <ol className="mt-14 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([n, title, body]) => (
                <li key={n} className="border-t border-ink-300 py-6">
                  <span className="font-mono text-[11.5px] text-brand-600">{n}</span>
                  <h3 className="mt-3 text-[16px] font-semibold text-ink-900">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="sla" className="border-t border-ink-200" aria-labelledby="sla-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow">How SLAs work</p>
              <h2 id="sla-heading" className="mt-4 font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink-900">
                Overdue and breached are different things.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
                A <span className="font-medium text-ink-900">due date</span> is the deadline you choose. An <span className="font-medium text-ink-900">SLA</span> is how long a piece of work is allowed to take, counted from the moment it&apos;s created. Flowboard tracks both, and tells you before a target is missed — not after.
              </p>
            </div>
            <div className="self-end lg:col-span-7">
              <SlaRuler />
            </div>
          </div>
        </section>

        <section className="border-y border-ink-900 bg-paper-200/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-2xl font-display text-[36px] leading-[1.08] text-ink-900 sm:text-[44px]">
              See where your work is waiting. <span className="italic text-ink-500">It takes a minute to set up.</span>
            </p>
            <LinkButton to={user ? '/app' : '/register'} size="lg">
              {user ? 'Go to dashboard' : 'Start now'} <ArrowRight />
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[12.5px] text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="flex items-center gap-2">
          <Logo className="h-4 w-4" /> © {new Date().getFullYear()} Flowboard
        </span>
        <span className="font-mono text-[11px]">MongoDB · Express · React · Node.js</span>
      </footer>
    </div>
  );
}
