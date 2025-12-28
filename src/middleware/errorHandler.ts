import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';
import { errorResponse } from '../shared/utils.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, 'Validation error', 400, errors);
  }

  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  const isDev = process.env.NODE_ENV === 'development';
  return errorResponse(
    res,
    isDev ? err.message : 'Internal server error',
    500
  );
}

export function notFoundHandler(req: Request, res: Response): Response {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
}
