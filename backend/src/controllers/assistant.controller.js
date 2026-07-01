const { redis, RedisKeys } = require('../config/redis');
const { ChatSession } = require('../config/mongodb');
const { env } = require('../config/env');
const { ErrorCodes, LLM_DAILY_LIMIT } = require('../constants/errorCodes');
const axios = require('axios');

/** POST /api/assistant/chat */
async function chat(req, res, next) {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Check daily LLM quota
    const countKey = RedisKeys.llmCount(userId, today);
    const currentCount = parseInt(await redis.get(countKey) || '0', 10);
    if (currentCount >= LLM_DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit reached',
        code: ErrorCodes.LLM_DAILY_LIMIT,
        message: `You have reached your daily limit of ${LLM_DAILY_LIMIT} AI queries. Please come back tomorrow.`,
        data: { used: currentCount, limit: LLM_DAILY_LIMIT },
      });
    }

    // Forward to Python AI service
    let aiResponse;
    try {
      const response = await axios.post(
        `${env.AI_SERVICE_URL}/ai/chat`,
        { message, sessionId, userId },
        { headers: { 'X-Internal-API-Key': env.INTERNAL_API_KEY }, timeout: 30000 }
      );
      aiResponse = response.data.data?.reply || response.data.reply;
    } catch (aiError) {
      console.error('AI service error:', aiError.message);
      aiResponse = "I'm having trouble connecting right now. Please try again in a moment.";
    }

    // Increment daily counter (expire at end of day)
    await redis.incr(countKey);
    await redis.expire(countKey, getSecondsUntilMidnight());

    // Persist conversation in Neon JSONB (via ChatSession proxy)
    await ChatSession.findOneAndUpdate(
      { session_id: sessionId },
      {
        $setOnInsert: { user_id: userId, created_at: new Date() },
        $push: {
          messages: {
            $each: [
              { role: 'user',      content: message,    timestamp: new Date() },
              { role: 'assistant', content: aiResponse, timestamp: new Date() },
            ],
          },
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        reply:       aiResponse,
        disclaimer:  'This is AI-generated advice. Please verify with a career professional.',
        quota:       { used: currentCount + 1, limit: LLM_DAILY_LIMIT },
      },
    });
  } catch (err) { next(err); }
}

/** GET /api/assistant/history?sessionId=xxx */
async function getChatHistory(req, res, next) {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing sessionId', code: ErrorCodes.VALIDATION_ERROR, message: 'sessionId query parameter is required.' });
    }

    const session = await ChatSession.findOne({ session_id: sessionId, user_id: req.user.userId });
    if (!session) {
      return res.json({ success: true, data: { messages: [] } });
    }

    res.json({ success: true, data: { messages: session.messages, createdAt: session.created_at } });
  } catch (err) { next(err); }
}

/** GET /api/assistant/quota */
async function getQuota(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const countKey = RedisKeys.llmCount(req.user.userId, today);
    const used = parseInt(await redis.get(countKey) || '0', 10);
    res.json({ success: true, data: { used, limit: LLM_DAILY_LIMIT, remaining: Math.max(0, LLM_DAILY_LIMIT - used) } });
  } catch (err) { next(err); }
}

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}

module.exports = { chat, getChatHistory, getQuota };
