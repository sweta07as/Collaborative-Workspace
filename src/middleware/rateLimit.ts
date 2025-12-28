import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { TooManyRequestsError } from '../shared/errors.js';

const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string
) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError(message));
    },
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    },
  });
};

export const generalRateLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests,
  'Too many requests, please try again later'
);

export const authRateLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.authMaxRequests,
  'Too many authentication attempts, please try again later'
);

export const strictRateLimiter = createRateLimiter(
  60000,
  10,
  'Rate limit exceeded for this operation'
);
