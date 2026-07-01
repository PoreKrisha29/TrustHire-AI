const winston = require('winston');
const { env } = require('../config/env');
const { ErrorCodes } = require('../constants/errorCodes');

// ── Winston logger ─────────────────────────────────────────────────
const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV !== 'production'
      ? winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ level, message, timestamp, stack }) =>
            `${timestamp} [${level}]: ${stack || message}`
          )
        )
      : winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Global error handler — register LAST in the middleware chain.
 * All errors passed via next(err) land here.
 */
function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Custom thrown errors (have statusCode attached)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.error || 'Error',
      code: err.code || ErrorCodes.INTERNAL_ERROR,
      message: err.message,
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      code: ErrorCodes.DUPLICATE,
      message: 'A record with this value already exists.',
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Not found',
      code: ErrorCodes.NOT_FOUND,
      message: 'The requested record was not found.',
    });
  }

  // Default 500
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: ErrorCodes.INTERNAL_ERROR,
    message: env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
}

/**
 * 404 handler — register AFTER all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: ErrorCodes.NOT_FOUND,
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
}

/**
 * Create a typed HTTP error to throw from controllers/services.
 * @param {number} statusCode
 * @param {string} message
 * @param {string} code - from ErrorCodes
 * @param {string} [error] - short error label
 */
function createHttpError(statusCode, message, code, error) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.error = error || message;
  return err;
}

module.exports = { logger, errorHandler, notFoundHandler, createHttpError };
