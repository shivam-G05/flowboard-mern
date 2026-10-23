import { z } from 'zod';
import { STATUSES } from '../utils/constants.js';
import { objectId } from './common.js';

const stageName = z.string().trim().min(1, 'Stage name is required').max(40, 'Stage name must be at most 40 characters');
const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Color must be a hex value like #6366f1');

export const stageParams = z.object({ stageId: objectId });

export const createStageSchema = z.object({
  name: stageName,
  category: z.enum(STATUSES),
  color: color.optional(),
  // Insert after this index; omitted = append before the first "done" stage.
  position: z.number().int().min(0).max(50).optional(),
});

export const updateStageSchema = z
  .object({ name: stageName, category: z.enum(STATUSES), color })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update');

export const reorderStagesSchema = z.object({ stageIds: z.array(objectId).min(1).max(50) });

export const deleteStageQuery = z.object({ moveTo: objectId.optional() });
