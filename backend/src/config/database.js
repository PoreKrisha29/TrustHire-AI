/**
 * TrustHire AI — Neon Serverless Database Connection
 * Replaces: prisma/config/database.js + Prisma client
 *
 * Uses @neondatabase/serverless with WebSocket pooling for serverless-safe connections.
 */

const { neon, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const ws = require('ws');
const schema = require('../db/schema');
const { env } = require('./env');

// Required for WebSocket-based connection pooling in Node.js
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

// Create Neon HTTP client (stateless, connection-pool friendly)
const sql = neon(env.DATABASE_URL);

// Create Drizzle ORM instance with schema
const db = drizzle(sql, { schema });

/**
 * connectDatabase — validate the connection at startup
 */
async function connectDatabase() {
  try {
    // Enable pgvector extension (safe to call repeatedly)
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    // Quick connectivity check
    await sql`SELECT 1`;
    console.log('✅ Neon PostgreSQL connected via Drizzle ORM');
  } catch (error) {
    console.error('❌ Neon PostgreSQL connection failed:', error.message);
    throw error;
  }
}

/**
 * disconnectDatabase — no-op for Neon HTTP (stateless connections)
 */
async function disconnectDatabase() {
  // Neon HTTP connections are stateless — no persistent pool to close.
  console.log('ℹ️  Neon connection closed (stateless)');
}

module.exports = { db, sql, connectDatabase, disconnectDatabase };
