const { verifyAccessToken } = require('../utils/jwt.utils');
const { redis, RedisKeys } = require('../config/redis');
const { ErrorCodes } = require('../constants/errorCodes');

/**
 * Verify JWT access token from Authorization: Bearer <token> header.
 * Also checks the token blocklist in Redis (for logged-out sessions).
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authorization header with Bearer token is required.',
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Check if token has been blocklisted (logout)
    const blocked = await redis.get(RedisKeys.tokenBlocklist(payload.jti));
    if (blocked) {
      return res.status(401).json({
        success: false,
        error: 'Token revoked',
        code: ErrorCodes.TOKEN_INVALID,
        message: 'This token has been revoked. Please log in again.',
      });
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Access token has expired. Please refresh your session.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: ErrorCodes.TOKEN_INVALID,
      message: 'The provided token is invalid.',
    });
  }
}

/**
 * Role-based access guard factory.
 * Usage: requireRole(['EMPLOYER', 'ADMIN'])
 * @param {string[]} roles
 */
function requireRole(roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You must be logged in.',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: ErrorCodes.FORBIDDEN,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
}

const requireCandidate = requireRole(['CANDIDATE']);
const requireEmployer  = requireRole(['EMPLOYER']);
const requireAdmin     = requireRole(['ADMIN']);
const requireAny       = requireRole(['CANDIDATE', 'EMPLOYER', 'ADMIN']);

/**
 * Internal service guard — Python AI service uses this to post results back.
 * Checks X-Internal-API-Key header.
 */
function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid internal API key',
      code: ErrorCodes.FORBIDDEN,
      message: 'This endpoint is for internal service communication only.',
    });
  }
  next();
}

module.exports = {
  authenticate,
  requireRole,
  requireCandidate,
  requireEmployer,
  requireAdmin,
  requireAny,
  requireInternalKey,
};
