// Display metadata for the enums the API uses. Mirrors server/src/utils/constants.js.
// Colour is reserved for meaning: urgency uses the accent, state uses the muted status colours.

export const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', level: 4, text: 'text-brand-600', dot: 'bg-brand-500' },
  { value: 'high', label: 'High', level: 3, text: 'text-ink-800', dot: 'bg-ink-800' },
  { value: 'medium', label: 'Medium', level: 2, text: 'text-ink-600', dot: 'bg-ink-500' },
  { value: 'low', label: 'Low', level: 1, text: 'text-ink-500', dot: 'bg-ink-300' },
];
export const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));

export const STATUSES = [
  { value: 'todo', label: 'To Do', accent: '#A09B8F' },
  { value: 'in_progress', label: 'In Progress', accent: '#B7791F' },
  { value: 'done', label: 'Done', accent: '#3F7A57' },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

export const SLA_HEALTH = {
  on_track: { label: 'On track', short: 'On track', text: 'text-good-600', dot: 'bg-good-500', bar: 'bg-good-500' },
  at_risk: { label: 'At risk', short: 'At risk', text: 'text-warn-600', dot: 'bg-warn-500', bar: 'bg-warn-500' },
  breached: { label: 'Breached', short: 'Breached', text: 'text-bad-600', dot: 'bg-bad-500', bar: 'bg-bad-500' },
  met: { label: 'SLA met', short: 'Met', text: 'text-good-600', dot: 'bg-good-500', bar: 'bg-good-500' },
  none: { label: 'No SLA', short: 'No SLA', text: 'text-ink-400', dot: 'bg-ink-300', bar: 'bg-ink-300' },
};

export const SLA_FILTERS = [
  { value: 'on_track', label: 'On track' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'breached', label: 'Breached' },
  { value: 'met', label: 'Met' },
  { value: 'none', label: 'No SLA' },
];

export const SLA_PRESETS = [
  { value: 4, label: '4 hours' },
  { value: 8, label: '8 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
];

export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'updatedAt', label: 'Updated' },
];

// Muted, earthy stage swatches that sit well on paper.
export const STAGE_COLORS = ['#A09B8F', '#5B6B8C', '#4F7C8A', '#3F7A57', '#8A9A5B', '#B7791F', '#C46B3E', '#D4552F', '#9B5B7A', '#6E5B9B'];
