const Redis = require('ioredis');
const { env } = require('./env');

let isMock = false;
const store = new Map();
const expiries = new Map();

// Periodically clean up expired keys
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of expiries.entries()) {
    if (now > expiry) {
      store.delete(key);
      expiries.delete(key);
    }
  }
}, 5000).unref();

const mockRedis = {
  async get(key) {
    const expiry = expiries.get(key);
    if (expiry && Date.now() > expiry) {
      store.delete(key);
      expiries.delete(key);
      return null;
    }
    return store.get(key) || null;
  },
  async setex(key, ttl, value) {
    store.set(key, String(value));
    expiries.set(key, Date.now() + (ttl * 1000));
    return 'OK';
  },
  async del(key) {
    const deleted = store.delete(key);
    expiries.delete(key);
    return deleted ? 1 : 0;
  },
  async incr(key) {
    const current = await this.get(key);
    const newVal = (parseInt(current || '0', 10) + 1);
    store.set(key, String(newVal));
    return newVal;
  },
  async expire(key, seconds) {
    if (store.has(key)) {
      expiries.set(key, Date.now() + (seconds * 1000));
      return 1;
    }
    return 0;
  },
  async connect() {
    isMock = true;
    console.log('ℹ️ Redis running in in-memory mock mode');
    return 'OK';
  },
  async quit() {
    return 'OK';
  },
  on() {},
  once() {},
};

// Create a real Redis instance but don't fail immediately on import
let realRedis;
try {
  if (env.REDIS_URL && env.REDIS_URL !== 'redis://:trusthire_dev_password@localhost:6379') {
    realRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    realRedis.on('error', (err) => {
      if (!isMock) {
        console.warn('⚠️ Real Redis error, switching to mock:', err.message);
        isMock = true;
      }
    });
  } else {
    isMock = true;
  }
} catch (e) {
  isMock = true;
}

// Proxy wrapper that delegates to real or mock client
const redis = new Proxy({}, {
  get(target, prop) {
    const activeClient = isMock ? mockRedis : (realRedis || mockRedis);
    const val = activeClient[prop];
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  }
});

/** All Redis key patterns — single place to manage all keys */
const RedisKeys = {
  refreshToken:   (userId)                  => `refresh:${userId}`,
  loginFail:      (email)                   => `login_fail:${email}`,
  loginLocked:    (email)                   => `login_locked:${email}`,
  pwReset:        (token)                   => `pw_reset:${token}`,
  emailVerify:    (token)                   => `email_verify:${token}`,
  tokenBlocklist: (jti)                     => `token_blocklist:${jti}`,
  matchScore:     (candidateId, jobId)      => `match:${candidateId}:${jobId}`,
  recommended:    (candidateId)             => `recommended:${candidateId}`,
  llmCount:       (userId, date)            => `llm_count:${userId}:${date}`,
  adminStats:     ()                        => `admin_stats`,
};

async function connectRedis() {
  if (isMock) {
    console.log('ℹ️ Redis running in in-memory mock mode');
    return;
  }
  try {
    await realRedis.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.warn('⚠️ Redis connection failed. Falling back to in-memory mock. Error:', error.message);
    isMock = true;
  }
}

async function disconnectRedis() {
  if (!isMock && realRedis) {
    await realRedis.quit();
  }
}

module.exports = { redis, RedisKeys, connectRedis, disconnectRedis };

