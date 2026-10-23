import { z } from 'zod';
import { PRIORITIES, SLA_HEALTH, STATUSES } from '../utils/constants.js';
import { csvEnum, nullableDate, objectId } from './common.js';

const hours = z.number().min(0).max(10000).nullable();

// No defaults here: for updates, a missing field must mean "leave unchanged".
const taskFields = {
  title: z.string().trim().min(1, 'Title is required').max(140, 'Title must be at most 140 characters'),
  description: z.string().max(5000),
  priority: z.enum(PRIORITIES),
  stageId: objectId,
  status: z.enum(STATUSES),
  startDate: nullableDate,
  dueDate: nullableDate,
  estimatedHours: hours,
  slaHours: hours,
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  assignee: z.string().trim().max(60).nullable(),
};

const datesInOrder = (t) => !(t.startDate && t.dueDate && t.dueDate < t.startDate);
const dateOrderError = { message: 'Due date cannot be before the start date', path: ['dueDate'] };

export const createTaskSchema = z
  .object({ ...taskFields, title: taskFields.title })
  .partial()
  .required({ title: true })
  .refine(datesInOrder, dateOrderError);

export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine(datesInOrder, dateOrderError)
  .refine((t) => Object.keys(t).length > 0, 'Nothing to update');

export const moveTaskSchema = z
  .object({ stageId: objectId.optional(), status: z.enum(STATUSES).optional() })
  .refine((b) => !!b.stageId !== !!b.status, 'Provide exactly one of stageId or status');

export const bulkUpdateSchema = z
  .object({
    ids: z.array(objectId).min(1).max(200),
    stageId: objectId.optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
  })
  .refine((b) => b.stageId || b.status || b.priority, 'Choose a status, stage or priority to apply');

export const bulkDeleteSchema = z.object({ ids: z.array(objectId).min(1).max(200) });

export const SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'];

export const listTasksQuery = z.object({
  search: z.string().trim().max(100).optional(),
  priority: csvEnum(PRIORITIES),
  status: csvEnum(STATUSES),
  stage: objectId.optional(),
  sla: z.enum(SLA_HEALTH).optional(),
  overdue: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  dueFrom: nullableDate.optional(),
  dueTo: nullableDate.optional(),
  tag: z.string().trim().max(30).optional(),
  sort: z.enum(SORT_FIELDS).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  // Board views ask for up to 500 cards at once; the list view pages through 10–100.
  limit: z.coerce.number().int().min(1).max(500).default(20),
});
