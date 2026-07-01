/**
 * Passport.js — Google OAuth 2.0 Strategy
 *
 * Flow:
 *  1. User clicks "Sign in with Google" → GET /api/auth/google
 *  2. passport.authenticate('google') redirects to Google's consent page
 *  3. Google redirects back to GET /api/auth/google/callback
 *  4. This strategy:
 *     - Looks up the user by email in the DB
 *     - Creates the user + profile if they don't exist (first OAuth login)
 *     - Marks email as verified (Google already confirmed it)
 *  5. req.user is populated → auth.controller.googleCallback issues JWT tokens
 */

const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db }        = require('./database');
const { users, candidateProfiles, notificationPreferences } = require('../db/schema');
const { eq }        = require('drizzle-orm');
const { env }       = require('./env');

function initPassport() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth not configured — GOOGLE_CLIENT_ID/SECRET missing. Skipping Passport setup.');
    return;
  }

  passport.use(new GoogleStrategy(
    {
      clientID:     env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL:  env.GOOGLE_CALLBACK_URL,
      scope:        ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value;
        const fullName  = profile.displayName || email?.split('@')[0] || 'Google User';
        const avatarUrl = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(null, false, { message: 'No email from Google — check OAuth scope.' });
        }

        // Check if user already exists
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
          const user = existing[0];
          // Ensure email is marked verified (Google vouches for it)
          if (!user.emailVerified) {
            await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
          }
          return done(null, { ...user, emailVerified: true });
        }

        // ── New user: create account + candidate profile ──────────
        const [newUser] = await db.insert(users).values({
          email,
          passwordHash:  null,           // no password for OAuth users
          role:          'CANDIDATE',    // default role; user can switch later
          emailVerified: true,           // Google already confirmed the email
        }).returning();

        await db.insert(candidateProfiles).values({
          userId:           newUser.id,
          fullName,
          avatarUrl,
          skills:           [],
          preferredJobTypes: [],
        });

        await db.insert(notificationPreferences).values({ userId: newUser.id });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  ));

  // We use stateless JWTs — no need for session serialization
  passport.serializeUser((user, done)   => done(null, user.id));
  passport.deserializeUser((id, done)   => done(null, { id }));

  console.log('✅ Google OAuth (Passport) strategy registered');
}

module.exports = { initPassport, passport };
