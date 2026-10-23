import { AppError } from '../utils/AppError.js';

/**
 * validate({ params, query, body }) — parses each part of the request with a Zod schema.
 *
 * The parsed result goes to req.valid. Zod drops keys the schema doesn't declare, so a client
 * can never set fields like `owner` or `completedAt` (mass-assignment protection), and every value
 * is type-checked, so `{ "$gt": "" }` style operator injection is rejected before reaching MongoDB.
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || part,
        message: issue.message,
      }));
      return next(new AppError(400, details[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR', details));
    }
    req.valid[part] = result.data;
  }
  next();
};
