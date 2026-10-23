import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParams = z.object({ id: objectId });

/** Accepts an ISO date string (or null to clear the value) and returns a Date. */
export const nullableDate = z.union([
  z.null(),
  z
    .string()
    .max(40)
    .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
    .transform((s) => new Date(s)),
]);

/** Query-string list: "high,urgent" or repeated params → ['high', 'urgent']. */
export const csvEnum = (values) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
    z.array(z.enum(values)).max(values.length).optional(),
  );

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
