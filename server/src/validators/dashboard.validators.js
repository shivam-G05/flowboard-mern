import { z } from 'zod';

// Minutes east of UTC, sent by the browser so "today" and daily trends match the user's clock.
export const summaryQuery = z.object({
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

export const activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
