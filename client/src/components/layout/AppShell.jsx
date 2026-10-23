import { AnimatePresence, motion } from 'framer-motion';
import { Columns3, LayoutDashboard, List, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Workflow, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { TaskUIProvider, useTaskUI } from '../../features/tasks/TaskUIProvider.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { cn } from '../../utils/cn.js';
import { Dropdown } from '../ui/Dropdown.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Logo } from './Logo.jsx';

const NAV = [
  { group: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    group: 'Views',
    items: [
      { to: '/app/tasks', label: 'List', icon: List },
      { to: '/app/board', label: 'Kanban', icon: Columns3 },
      { to: '/app/pipeline', label: 'Pipeline', icon: Workflow },
    ],
  },
];

function NavItem({ item, collapsed, onNavigate }) {
  const { search } = useLocation();
  // Views share filters, so moving between them keeps the current query string.
  const carry = item.to !== '/app' ? search.replace(/([?&])(task|page)=[^&]*/g, '$1').replace(/[?&]+$/, '') : '';
  return (
    <NavLink
      to={`${item.to}${carry}`}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-ink-900/[0.06] font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-900/[0.04] hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-mark" className="absolute -left-3 top-1.5 h-5 w-[3px] rounded-r bg-brand-500" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }} />}
          <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-ink-900' : 'text-ink-400 group-hover:text-ink-700')} strokeWidth={1.75} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function UserBlock({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Dropdown
      label="Account menu"
      align="left"
      side="top"
      className="w-full"
      triggerClassName="w-full"
      items={[{ label: 'Sign out', icon: LogOut, onSelect: () => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) }) }]}
      trigger={
        <span className={cn('flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-ink-900/[0.04]', collapsed && 'justify-center')}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 font-mono text-[10.5px] font-medium text-paper-50">{initials}</span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium leading-tight text-ink-900">{user?.name}</span>
              <span className="block truncate text-[11.5px] leading-tight text-ink-500">{user?.email}</span>
            </span>
          )}
        </span>
      }
    />
  );
}

function Sidebar({ collapsed, onToggle, onNavigate, mobile = false }) {
  const ui = useTaskUI();
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className={cn('mb-5 flex items-center justify-between px-1', collapsed && 'flex-col gap-3 px-0')}>
        <span className="flex items-center gap-2">
          <Logo />
          {!collapsed && <span className="font-display text-[21px] leading-none text-ink-900">Flowboard</span>}
        </span>
        {!mobile && (
          <button onClick={onToggle} className="rounded-md p-1 text-ink-400 hover:bg-ink-900/5 hover:text-ink-800" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        )}
      </div>

      <button
        onClick={() => {
          ui.openCreate();
          onNavigate?.();
        }}
        className={cn(
          'mb-6 flex h-8 items-center gap-2 rounded-md border border-ink-300 bg-paper-50 px-2.5 text-[13px] font-medium text-ink-800 transition-colors hover:border-ink-500',
          collapsed && 'justify-center px-0',
        )}
        aria-label="Create a new task"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {!collapsed && (
          <>
            New task <span className="kbd ml-auto">N</span>
          </>
        )}
      </button>

      <nav aria-label="Main" className="flex-1 space-y-6">
        {NAV.map((section) => (
          <div key={section.group}>
            {!collapsed && <p className="eyebrow mb-1.5 px-2.5">{section.group}</p>}
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-ink-200 pt-3', collapsed && 'border-0')}>
        <UserBlock collapsed={collapsed} />
      </div>
    </div>
  );
}

/** Keyboard shortcut "N" opens the new-task dialog from anywhere in the app. */
function ShortcutListener() {
  const ui = useTaskUI();
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key.toLowerCase() === 'n' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        ui.openCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui]);
  return null;
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-72" />
      <div className="h-px bg-ink-200" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useLocalStorage('fb.sidebarCollapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <TaskUIProvider>
      <ShortcutListener />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper-50 focus:px-4 focus:py-2 focus:shadow-float">
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 232 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="sticky top-0 z-20 hidden h-screen shrink-0 border-r border-ink-200 bg-paper-200/60 lg:block"
        >
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </motion.aside>

        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <motion.div className="absolute inset-0 bg-ink-950/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="absolute inset-y-0 left-0 w-[248px] border-r border-ink-200 bg-paper-100"
              >
                <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 rounded-md p-1 text-ink-500 hover:bg-ink-900/5" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
                <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile-only top bar; on desktop everything lives in the sidebar. */}
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-ink-200 bg-paper-100/95 px-3 backdrop-blur lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-ink-700 hover:bg-ink-900/5" aria-label="Open menu">
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <Logo className="h-5 w-5" />
            <span className="font-display text-[19px] leading-none">Flowboard</span>
          </header>

          <main id="main" className="flex-1 px-4 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-9">
            {/* Fade on section change; the three task views share a key so switching keeps the page mounted. */}
            <motion.div
              key={location.pathname === '/app' ? 'dashboard' : 'tasks'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="mx-auto max-w-[1440px]"
            >
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </main>
        </div>
      </div>
    </TaskUIProvider>
  );
}
