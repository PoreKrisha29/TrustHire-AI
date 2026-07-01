/**
 * TrustHire AI — Neon Document Store
 * Replaces: src/config/mongodb.js (Mongoose + MongoDB)
 *
 * Resume analyses and chat sessions are now stored as JSONB in Neon PostgreSQL.
 * The API is intentionally designed to be a drop-in replacement for the old
 * MongoDB models so controller changes are minimal.
 */

const { db } = require('./database');
const { resumeAnalyses, chatSessions } = require('../db/schema');
const { eq, desc, and, sql } = require('drizzle-orm');

// ── Resume Analysis (replaces Mongoose ResumeAnalysis model) ───────

const ResumeAnalysis = {
  /**
   * Count analyses for a candidate
   */
  async countDocuments({ candidate_id }) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(resumeAnalyses)
      .where(eq(resumeAnalyses.candidateId, candidate_id));
    return parseInt(result[0]?.count ?? 0, 10);
  },

  /**
   * Find the most recent analysis for a candidate.
   * Returns a thenable object with .sort() support for backward compat.
   */
  findOne({ candidate_id }) {
    // Returns an object with a chainable .sort() and direct .then()
    const queryFn = async () => {
      const rows = await db
        .select()
        .from(resumeAnalyses)
        .where(eq(resumeAnalyses.candidateId, candidate_id))
        .orderBy(desc(resumeAnalyses.analyzedAt))
        .limit(1);
      return rows[0] ? _mapAnalysis(rows[0]) : null;
    };

    return {
      sort(_sortSpec) {
        // sort is always by analyzedAt desc — matches old API
        return queryFn();
      },
      then(resolve, reject) {
        return queryFn().then(resolve, reject);
      },
    };
  },

  /**
   * Find analysis by id
   */
  async findById(id) {
    const rows = await db
      .select()
      .from(resumeAnalyses)
      .where(eq(resumeAnalyses.id, id));
    return rows[0] ? _mapAnalysis(rows[0]) : null;
  },

  /**
   * Find all analyses for a candidate (up to limit)
   */
  async findByCandidateId(candidate_id, limit = 10) {
    const rows = await db
      .select()
      .from(resumeAnalyses)
      .where(eq(resumeAnalyses.candidateId, candidate_id))
      .orderBy(desc(resumeAnalyses.analyzedAt))
      .limit(limit);
    return rows.map(_mapAnalysis);
  },

  /**
   * Delete one analysis by internal _id
   */
  async deleteOne({ _id }) {
    const result = await db
      .delete(resumeAnalyses)
      .where(eq(resumeAnalyses.id, _id))
      .returning({ id: resumeAnalyses.id });
    return { deletedCount: result.length };
  },

  /**
   * Delete oldest analysis for a candidate (for 3-report limit)
   */
  async deleteOldest(candidate_id) {
    // Find the oldest
    const oldest = await db
      .select({ id: resumeAnalyses.id })
      .from(resumeAnalyses)
      .where(eq(resumeAnalyses.candidateId, candidate_id))
      .orderBy(resumeAnalyses.analyzedAt)
      .limit(1);

    if (oldest.length === 0) return { deletedCount: 0 };
    const result = await db
      .delete(resumeAnalyses)
      .where(eq(resumeAnalyses.id, oldest[0].id))
      .returning({ id: resumeAnalyses.id });
    return { deletedCount: result.length };
  },

  /**
   * Create a new analysis record
   */
  async create(data) {
    const {
      candidate_id,
      file_url,
      overall_score,
      ats_score,
      strengths = [],
      weaknesses = [],
      suggestions = [],
      missing_keywords = [],
      integrity_flags = [],
      target_role = null,
    } = data;

    // Enforce 3-analysis limit
    const count = await ResumeAnalysis.countDocuments({ candidate_id });
    if (count >= 3) {
      await ResumeAnalysis.deleteOldest(candidate_id);
    }

    const [row] = await db.insert(resumeAnalyses).values({
      candidateId:  candidate_id,
      fileUrl:      file_url,
      overallScore: overall_score,
      atsScore:     ats_score,
      data: { strengths, weaknesses, suggestions, missing_keywords, integrity_flags },
      targetRole:   target_role,
    }).returning();

    return _mapAnalysis(row);
  },
};

// ── Chat Session (replaces Mongoose ChatSession model) ─────────────

const ChatSession = {
  /**
   * Find a session by session_id + user_id
   */
  findOne({ session_id, user_id }) {
    const queryFn = async () => {
      const rows = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.sessionId, session_id),
            eq(chatSessions.userId, user_id)
          )
        )
        .limit(1);
      return rows[0] ? _mapSession(rows[0]) : null;
    };

    return {
      then(resolve, reject) {
        return queryFn().then(resolve, reject);
      },
    };
  },

  /**
   * Upsert a session and optionally push messages to the messages array.
   * Mirrors: findOneAndUpdate({ session_id, user_id }, { $push: { messages: { $each: [...] } } }, { upsert: true })
   */
  async findOneAndUpdate({ session_id }, update, options = {}) {
    // Determine user_id from update or existing row
    const existing = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.sessionId, session_id))
      .limit(1);

    let session = existing[0];

    if (!session) {
      if (!options.upsert) return null;

      // Extract user_id from $setOnInsert
      const userId = update.$setOnInsert?.user_id;
      if (!userId) throw new Error('user_id required for upsert');

      const [inserted] = await db.insert(chatSessions).values({
        sessionId: session_id,
        userId,
        messages: [],
      }).returning();
      session = inserted;
    }

    // Apply $push messages
    let newMessages = Array.isArray(session.messages) ? [...session.messages] : [];
    if (update.$push?.messages) {
      const pushed = update.$push.messages;
      if (pushed.$each) {
        newMessages.push(...pushed.$each);
      } else {
        newMessages.push(pushed);
      }
    } else if (update.messages) {
      newMessages = update.messages;
    }

    // Keep last 100 messages max
    if (newMessages.length > 100) {
      newMessages = newMessages.slice(-100);
    }

    const [updated] = await db
      .update(chatSessions)
      .set({ messages: newMessages })
      .where(eq(chatSessions.id, session.id))
      .returning();

    return _mapSession(updated);
  },
};

// ── Internal mappers ───────────────────────────────────────────────

function _mapAnalysis(row) {
  return {
    _id:             row.id,
    candidate_id:    row.candidateId,
    file_url:        row.fileUrl,
    overall_score:   row.overallScore,
    ats_score:       row.atsScore,
    analyzed_at:     row.analyzedAt,
    target_role:     row.targetRole,
    // Spread JSONB data fields for backward compat
    ...(row.data || {}),
  };
}

function _mapSession(row) {
  return {
    _id:        row.id,
    session_id: row.sessionId,
    user_id:    row.userId,
    messages:   row.messages || [],
    created_at: row.createdAt,
  };
}

// ── No-op connect/disconnect (Neon is stateless) ──────────────────

async function connectMongoDB() {
  console.log('ℹ️  Document store: using Neon JSONB (MongoDB replaced)');
}

async function disconnectMongoDB() {
  // no-op
}

module.exports = { connectMongoDB, disconnectMongoDB, ResumeAnalysis, ChatSession };
