const { z } = require('zod');
const { ErrorCodes } = require('../constants/errorCodes');

/**
 * Validate req.body against a Zod schema.
 * Returns 400 with field-level error details on failure.
 * @param {import('zod').ZodSchema} schema
 */
function validateBody(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Request body contains invalid or missing fields.',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate req.query against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
function validateQuery(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'One or more query parameters are invalid.',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.query = result.data;
    next();
  };
}

/**
 * Parse pagination query params (page, limit) and attach to res.locals.
 * Defaults: page=1, limit=20. Max limit: 50.
 */
function parsePagination(req, res, next) {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const skip  = (page - 1) * limit;
  res.locals.pagination = { page, limit, skip };
  next();
}

module.exports = { validateBody, validateQuery, parsePagination };
