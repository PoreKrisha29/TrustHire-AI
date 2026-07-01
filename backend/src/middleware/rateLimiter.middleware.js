const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { ErrorCodes } = require('../constants/errorCodes');

function rateLimitResponse(message) {
  return {
    success: false,
    error: 'Rate limit exceeded',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message,
  };
}

/** Global: 100 requests per minute per IP */
const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests. Please wait and try again.'),
});

/** Auth routes: 10 requests per minute per IP */
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitResponse('Too many login attempts. Please wait before trying again.'),
});

/** File uploads: 5 per 5 minutes per IP */
const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many file uploads. Please wait a few minutes.'),
});

module.exports = { globalRateLimiter, authRateLimiter, uploadRateLimiter };
