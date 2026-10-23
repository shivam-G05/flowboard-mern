// Single place for the enums shared by models, validators and services.

// Status is a *category*. Every workflow stage belongs to exactly one category,
// so custom stages ("In Review", "QA", ...) still roll up into a small, fixed set
// that the Kanban board, filters and analytics can rely on.
export const STATUSES = ['todo', 'in_progress', 'done'];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Stored on each task so "sort by priority" is a plain indexed numeric sort.
export const PRIORITY_RANK = { low: 1, medium: 2, high: 3, urgent: 4 };

export const SLA_HEALTH = ['on_track', 'at_risk', 'breached', 'met', 'none'];

// A task is "at risk" once 75% of its SLA window has been used.
export const SLA_AT_RISK_RATIO = 0.75;

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const DEFAULT_STAGES = [
  { name: 'Backlog', category: 'todo', color: '#A09B8F' },
  { name: 'To Do', category: 'todo', color: '#5B6B8C' },
  { name: 'In Progress', category: 'in_progress', color: '#B7791F' },
  { name: 'In Review', category: 'in_progress', color: '#6E5B9B' },
  { name: 'Done', category: 'done', color: '#3F7A57' },
];

export const MAX_STAGES = 12;

// Keep embedded transition history bounded so a task document can never grow without limit.
export const MAX_STAGE_HISTORY = 200;

export const AUTH_COOKIE = 'fb_session';
