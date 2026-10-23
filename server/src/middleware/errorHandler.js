import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
}

// Express recognises an error handler by its four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.CastError) {
    error = AppError.badRequest(`Invalid value for ${err.path}`);
  } else if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = new AppError(400, details[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', details);
  } else if (err?.code === 11000) {
    error = AppError.conflict('A record with that value already exists');
  } else if (err?.type === 'entity.parse.failed') {
    error = AppError.badRequest('Request body is not valid JSON');
  } else if (err?.type === 'entity.too.large') {
    error = new AppError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  }

  if (!(error instanceof AppError)) {
    // Unexpected failure: log the stack for us, return a generic message to the client.
    if (!env.isTest) console.error('[unhandled]', err);
    error = new AppError(500, 'Something went wrong on our side. Please try again.', 'INTERNAL_ERROR');
  }

  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
