const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password.
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Check password meets minimum security requirements.
 * Rules: 8+ chars, 1 uppercase, 1 number, 1 special character.
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8)
    return { valid: false, message: 'Password must be at least 8 characters long' };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[0-9]/.test(password))
    return { valid: false, message: 'Password must contain at least one number' };
  if (!/[^A-Za-z0-9]/.test(password))
    return { valid: false, message: 'Password must contain at least one special character (e.g. ! @ # $)' };
  return { valid: true };
}

module.exports = { hashPassword, comparePassword, validatePasswordStrength };
