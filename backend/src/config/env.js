require('dotenv').config();

/**
 * All environment variables validated at startup.
 * The server will NOT start if required vars are missing.
 */

const required = [
  'DATABASE_URL',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,

  // JWT
  JWT_PRIVATE_KEY: (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  JWT_PUBLIC_KEY: (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', // HS256 fallback for dev
  JWT_ACCESS_TOKEN_TTL: parseInt(process.env.JWT_ACCESS_TOKEN_TTL || '900', 10),
  JWT_REFRESH_TOKEN_TTL: parseInt(process.env.JWT_REFRESH_TOKEN_TTL || '604800', 10),

  // AWS S3 / MinIO
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || null,
  AWS_S3_FORCE_PATH_STYLE: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',

  // SendGrid
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || null,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@trusthireai.com',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'TrustHire AI',

  // Internal
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
};

module.exports = { env };
