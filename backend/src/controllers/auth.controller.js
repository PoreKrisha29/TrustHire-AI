const { db } = require('../config/database');
const { redis, RedisKeys } = require('../config/redis');
const { users, candidateProfiles, employerProfiles, notificationPreferences } = require('../db/schema');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/bcrypt.utils');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenTTL, generateSecureToken } = require('../utils/jwt.utils');
const { ErrorCodes } = require('../constants/errorCodes');
const { env } = require('../config/env');
const { eq } = require('drizzle-orm');
const emailService = require('../config/email.service');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_SECS = 15 * 60; // 15 minutes

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, role, fullName } = req.body;

    // Check password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ success: false, error: 'Weak password', code: ErrorCodes.VALIDATION_ERROR, message: strength.message });
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered', code: ErrorCodes.EMAIL_ALREADY_EXISTS, message: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const verifyToken  = generateSecureToken();

    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      role,
      emailVerified: false,
    }).returning();

    // Create skeleton profile based on role
    if (role === 'CANDIDATE') {
      await db.insert(candidateProfiles).values({
        userId:           user.id,
        fullName:         fullName || email.split('@')[0],
        skills:           [],
        preferredJobTypes: [],
      });
    } else if (role === 'EMPLOYER') {
      await db.insert(employerProfiles).values({
        userId:      user.id,
        companyName: fullName || 'My Company',
      });
    }

    // Create notification preferences
    await db.insert(notificationPreferences).values({ userId: user.id });

    // Store verify token in Redis (TTL: 24h)
    await redis.setex(RedisKeys.emailVerify(verifyToken), 86400, user.id);

    // Send email verification (falls back to console log when SendGrid not set up)
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    await emailService.sendVerificationEmail({
      to:      email,
      fullName: fullName || email.split('@')[0],
      verifyUrl,
    });

    // Also send welcome email
    await emailService.sendWelcomeEmail({ to: email, fullName: fullName || email.split('@')[0], role });

    res.status(201).json({
      success: true,
      data: { userId: user.id, email: user.email, role: user.role },
      message: 'Account created. Please check your email to verify your account.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Check account lockout
    const locked = await redis.get(RedisKeys.loginLocked(email));
    if (locked) {
      return res.status(423).json({
        success: false,
        error: 'Account locked',
        code: ErrorCodes.ACCOUNT_LOCKED,
        message: 'Too many failed attempts. Please try again in 15 minutes.',
      });
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    if (!user || !user.passwordHash) {
      await incrementLoginFails(email);
      return res.status(401).json({ success: false, error: 'Invalid credentials', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Email or password is incorrect.' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      await incrementLoginFails(email);
      return res.status(401).json({ success: false, error: 'Invalid credentials', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Email or password is incorrect.' });
    }

    // In development: skip email verification gate so devs can log in immediately
    if (!user.emailVerified && env.NODE_ENV !== 'development') {
      return res.status(403).json({ success: false, error: 'Email not verified', code: ErrorCodes.EMAIL_NOT_VERIFIED, message: 'Please verify your email before logging in. (Check server console for the verification link)' });
    }

    // Clear login fail counter on success
    await redis.del(RedisKeys.loginFail(email));

    const { token: accessToken } = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const { token: refreshToken } = generateRefreshToken(user.id);

    // Store refresh token in Redis
    await redis.setex(RedisKeys.refreshToken(user.id), env.JWT_REFRESH_TOKEN_TTL, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    const payload = verifyRefreshToken(token);

    const stored = await redis.get(RedisKeys.refreshToken(payload.sub));
    if (!stored || stored !== token) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token', code: ErrorCodes.TOKEN_INVALID, message: 'Refresh token is invalid or expired.' });
    }

    const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!rows[0]) {
      return res.status(401).json({ success: false, error: 'User not found', code: ErrorCodes.TOKEN_INVALID, message: 'User no longer exists.' });
    }
    const user = rows[0];

    // Rotate: issue new tokens
    const { token: newAccessToken }  = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const { token: newRefreshToken } = generateRefreshToken(user.id);
    await redis.setex(RedisKeys.refreshToken(user.id), env.JWT_REFRESH_TOKEN_TTL, newRefreshToken);

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid refresh token', code: ErrorCodes.TOKEN_EXPIRED, message: 'Refresh token has expired. Please log in again.' });
    }
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const { jti } = req.user;
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const ttl = getTokenTTL(token);

    if (ttl > 0) {
      await redis.setex(RedisKeys.tokenBlocklist(jti), ttl, '1');
    }
    await redis.del(RedisKeys.refreshToken(req.user.userId));

    res.json({ success: true, data: null, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/verify-email?token=xxx
 */
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing token', code: ErrorCodes.VALIDATION_ERROR, message: 'Verification token is required.' });
    }

    const userId = await redis.get(RedisKeys.emailVerify(token));
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Invalid token', code: ErrorCodes.TOKEN_INVALID, message: 'This verification link has expired or is invalid. Please request a new one.' });
    }

    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
    await redis.del(RedisKeys.emailVerify(token));

    res.json({ success: true, data: null, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    // Always return 200 to prevent email enumeration
    if (user) {
      const resetToken = generateSecureToken();
      await redis.setex(RedisKeys.pwReset(resetToken), 1800, user.id); // 30 min TTL

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail({
        to:       email,
        fullName: null, // could fetch profile if needed
        resetUrl,
      });
    }

    res.json({ success: true, data: null, message: 'If an account exists for this email, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ success: false, error: 'Weak password', code: ErrorCodes.VALIDATION_ERROR, message: strength.message });
    }

    const userId = await redis.get(RedisKeys.pwReset(token));
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token', code: ErrorCodes.TOKEN_INVALID, message: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await redis.del(RedisKeys.pwReset(token));
    // Invalidate any existing refresh tokens
    await redis.del(RedisKeys.refreshToken(userId));

    res.json({ success: true, data: null, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const rows = await db
      .select({
        id:            users.id,
        email:         users.email,
        role:          users.role,
        emailVerified: users.emailVerified,
        createdAt:     users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found', code: ErrorCodes.NOT_FOUND, message: 'User not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/google — redirect to Google OAuth
 * Handled by passport middleware in auth.routes.js
 */
function googleAuth(_req, res) {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
  }
  // passport.authenticate('google') middleware handles this before reaching here
  res.status(501).json({ success: false, error: 'Passport not mounted', message: 'Google OAuth not configured.' });
}

/**
 * GET /api/auth/google/callback — called by Google after user consents
 * Passport middleware populates req.user; we issue JWT tokens and redirect.
 */
async function googleCallback(req, res) {
  try {
    if (!req.user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    const user = req.user;
    const { token: accessToken }  = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const { token: refreshToken } = generateRefreshToken(user.id);
    await redis.setex(RedisKeys.refreshToken(user.id), env.JWT_REFRESH_TOKEN_TTL, refreshToken);

    // Redirect to frontend with tokens in query params (frontend grabs & stores them)
    const params = new URLSearchParams({ accessToken, refreshToken, role: user.role });
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

async function incrementLoginFails(email) {
  const key = RedisKeys.loginFail(email);
  const count = await redis.incr(key);
  await redis.expire(key, LOCK_DURATION_SECS);

  if (count >= MAX_LOGIN_ATTEMPTS) {
    await redis.setex(RedisKeys.loginLocked(email), LOCK_DURATION_SECS, '1');
    await redis.del(key);
  }
}

module.exports = { register, login, refreshToken, logout, verifyEmail, forgotPassword, resetPassword, getMe, googleAuth, googleCallback };
