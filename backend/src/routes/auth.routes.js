const { Router } = require('express');
const { z } = require('zod');
const AuthController  = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { authRateLimiter } = require('../middleware/rateLimiter.middleware');
const { passport }    = require('../config/passport');
const { env }         = require('../config/env');

const router = Router();

// ── Google OAuth middleware helpers ───────────────────────────────
const googleAuthMiddleware = env.GOOGLE_CLIENT_ID
  ? passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  : (_req, res) => res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);

const googleCallbackMiddleware = env.GOOGLE_CLIENT_ID
  ? passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed` })
  : (_req, _res, next) => next();

const registerSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['CANDIDATE', 'EMPLOYER'], { errorMap: () => ({ message: 'Role must be CANDIDATE or EMPLOYER' }) }),
  fullName: z.string().min(2).max(255).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

router.post('/register',        authRateLimiter, validateBody(registerSchema),      AuthController.register);
router.post('/login',           authRateLimiter, validateBody(loginSchema),         AuthController.login);
router.post('/refresh',         validateBody(refreshSchema),                        AuthController.refreshToken);
router.post('/logout',          authenticate,                                       AuthController.logout);
router.get( '/verify-email',                                                        AuthController.verifyEmail);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema),AuthController.forgotPassword);
router.post('/reset-password',  authRateLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);
router.get( '/me',              authenticate,                                       AuthController.getMe);
router.get( '/google',          googleAuthMiddleware);
router.get( '/google/callback', googleCallbackMiddleware, AuthController.googleCallback);

module.exports = router;
