import { motion } from 'framer-motion';
import { Columns3, List, Plus, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { KanbanView } from '../features/tasks/KanbanView.jsx';
import { ListView } from '../features/tasks/ListView.jsx';
import { TaskToolbar } from '../features/tasks/TaskToolbar.jsx';
import { useTaskFilters } from '../features/tasks/useTaskFilters.js';
import { useTaskUI } from '../features/tasks/TaskUIProvider.jsx';
import { PipelineView } from '../features/workflows/PipelineView.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { cn } from '../utils/cn.js';

const VIEWS = [
  { id: 'list', path: '/app/tasks', label: 'List', icon: List, title: 'All tasks', description: 'Every task in one place — sort, filter, select and edit in line.' },
  { id: 'board', path: '/app/board', label: 'Kanban', icon: Columns3, title: 'Board', description: 'Tasks grouped by status. Drag a card to change it.' },
  { id: 'pipeline', path: '/app/pipeline', label: 'Pipeline', icon: Workflow, title: 'Pipeline', description: 'Your workflow, stage by stage — with how long work waits in each.' },
];

/** Underlined tabs that keep the query string, so filters survive switching views. */
function ViewTabs({ current }) {
  const { search } = useLocation();
  const carried = new URLSearchParams(search);
  carried.delete('page'); // page numbers only mean something in the list view
  carried.delete('task');
  const qs = carried.toString() ? `?${carried}` : '';

  return (
    <nav aria-label="Task views" className="-mb-5 mt-6 flex gap-6">
      {VIEWS.map((v) => {
        const active = v.id === current;
        return (
          <Link
            key={v.id}
            to={`${v.path}${qs}`}
            aria-current={active ? 'page' : undefined}
            className={cn('relative flex items-center gap-1.5 rounded-sm pb-3 text-[13.5px] transition-colors', active ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900')}
          >
            <v.icon className="h-4 w-4" strokeWidth={1.75} />
            {v.label}
            {active && <motion.span layoutId="view-underline" className="absolute inset-x-0 -bottom-px h-[2px] bg-ink-900" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }} />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function TasksPage({ view }) {
  const meta = VIEWS.find((v) => v.id === view);
  useDocumentMeta({ title: meta.title, noindex: true });
  const ui = useTaskUI();
  const { filters, filterParams, setFilters, clearFilters, activeCount } = useTaskFilters();

  return (
    <div>
      <PageHeader
        eyebrow="Workspace · Tasks"
        title={meta.title}
        description={meta.description}
        actions={
          <Button onClick={() => ui.openCreate()}>
            <Plus /> New task <span className="kbd ml-1 border-paper-50/20 bg-transparent text-paper-100/70">N</span>
          </Button>
        }
      >
        <ViewTabs current={view} />
      </PageHeader>

      <TaskToolbar filters={filters} setFilters={setFilters} clearFilters={clearFilters} activeCount={activeCount} showSort={view === 'list'} />

      {view === 'list' && <ListView filters={filters} setFilters={setFilters} clearFilters={clearFilters} activeCount={activeCount} />}
      {view === 'board' && <KanbanView filterParams={filterParams} />}
      {view === 'pipeline' && <PipelineView filterParams={filterParams} />}
    </div>
  );
}
