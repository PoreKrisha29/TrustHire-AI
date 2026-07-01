const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');

/**
 * Returns the signing secret/key.
 * Uses RS256 (asymmetric) if private key is configured,
 * falls back to HS256 (symmetric) for local dev convenience.
 */
function getSigningKey() {
  return env.JWT_PRIVATE_KEY || env.JWT_SECRET;
}

function getVerifyKey() {
  return env.JWT_PUBLIC_KEY || env.JWT_SECRET;
}

function getAlgorithm() {
  return env.JWT_PRIVATE_KEY ? 'RS256' : 'HS256';
}

/**
 * Generate an access token (15 min default).
 * @param {{ userId, email, role }} payload
 * @returns {{ token: string, jti: string }}
 */
function generateAccessToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: payload.userId, email: payload.email, role: payload.role, jti },
    getSigningKey(),
    { algorithm: getAlgorithm(), expiresIn: env.JWT_ACCESS_TOKEN_TTL }
  );
  return { token, jti };
}

/**
 * Generate a refresh token (7 days default).
 * @param {string} userId
 * @returns {{ token: string, jti: string }}
 */
function generateRefreshToken(userId) {
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: userId, jti },
    getSigningKey(),
    { algorithm: getAlgorithm(), expiresIn: env.JWT_REFRESH_TOKEN_TTL }
  );
  return { token, jti };
}

/**
 * Verify and decode an access token.
 * Throws jwt.JsonWebTokenError or jwt.TokenExpiredError on failure.
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, getVerifyKey(), { algorithms: [getAlgorithm()] });
}

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, getVerifyKey(), { algorithms: [getAlgorithm()] });
}

/**
 * Get remaining TTL (in seconds) of a token without verifying signature.
 * @param {string} token
 * @returns {number}
 */
function getTokenTTL(token) {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return 0;
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
}

/**
 * Generate a secure random token for email verify / password reset.
 * @returns {string}
 */
function generateSecureToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenTTL,
  generateSecureToken,
};
