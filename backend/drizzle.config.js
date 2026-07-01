/**
 * Drizzle Kit Configuration
 * Used by: npx drizzle-kit push  (push schema to Neon)
 *          npx drizzle-kit studio (visual DB browser)
 *
 * Run: cd backend && npx drizzle-kit push
 */

require('dotenv').config();

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/db/schema.js',
  out:    './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: false,
};
