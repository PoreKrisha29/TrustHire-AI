/**
 * TrustHire AI — Backend Entry Point (Neon + Drizzle ORM)
 * Start: npm run dev (development) | npm start (production)
 */

// Load env FIRST before any other imports
const { env } = require('./config/env');

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const compression = require('compression');
const path        = require('path');

const { connectDatabase, disconnectDatabase } = require('./config/database');
const { connectRedis, disconnectRedis }       = require('./config/redis');
const { connectMongoDB, disconnectMongoDB }   = require('./config/mongodb');
const { initPassport, passport }              = require('./config/passport');
const { globalRateLimiter }                   = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler, logger } = require('./middleware/error.middleware');
const apiRoutes                               = require('./routes/index');

const app = express();

// ── Security middleware ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? env.FRONTEND_URL
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key'],
}));

// ── Request parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ── Passport (Google OAuth — stateless, no sessions) ──────────────
initPassport();
app.use(passport.initialize());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── HTTP request logging ───────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Global rate limiter ────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Root info endpoint ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'TrustHire AI Backend',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
    environment: env.NODE_ENV,
  });
});

// ── API routes ─────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 handler (must be after all routes) ─────────────────────────
app.use(notFoundHandler);

// ── Global error handler (must be last) ───────────────────────────
app.use(errorHandler);

// ── Database connections + server start ───────────────────────────
async function startServer() {
  try {
    logger.info('🔗 Connecting to databases...');

    await connectDatabase();   // Neon PostgreSQL (Drizzle ORM)
    await connectRedis();      // Redis (BullMQ + cache)
    await connectMongoDB();    // Neon JSONB document store (replaces MongoDB)

    const server = app.listen(env.PORT, () => {
      logger.info('─'.repeat(50));
      logger.info(`🚀 TrustHire AI Backend running`);
      logger.info(`   PORT:        ${env.PORT}`);
      logger.info(`   ENV:         ${env.NODE_ENV}`);
      logger.info(`   FRONTEND:    ${env.FRONTEND_URL}`);
      logger.info(`   HEALTH:      http://localhost:${env.PORT}/api/health`);
      logger.info('─'.repeat(50));
    });

    // ── Graceful shutdown ──────────────────────────────────────────
    async function shutdown(signal) {
      logger.info(`\n${signal} received — shutting down gracefully...`);
      server.close(async () => {
        try {
          await disconnectDatabase();
          await disconnectRedis();
          await disconnectMongoDB();
          logger.info('✅ All connections closed. Goodbye.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (err) {
    logger.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app; // export for testing
