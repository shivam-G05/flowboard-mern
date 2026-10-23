import { z } from 'zod';

// Client-side validation gives instant feedback. The server validates again — it never trusts the browser.

const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const registerSchema = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80), email, password });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

/** Runs a Zod schema and returns { data } or { errors: { field: message } }. */
export function validateForm(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}
