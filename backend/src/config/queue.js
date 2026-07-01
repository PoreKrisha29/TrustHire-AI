const { Queue } = require('bullmq');
const { redis, RedisKeys } = require('./redis');
const { db } = require('./database');
const { jobListings, applications } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

const QUEUE_NAMES = {
  TRUST_SCORE:     'trust-score-queue',
  RESUME_ANALYSIS: 'resume-analysis-queue',
  MATCH_SCORE:     'match-score-queue',
  EMAIL:           'email-queue',
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

let trustScoreQueue, resumeAnalysisQueue, matchScoreQueue, emailQueue;
let useQueueMocks = false;

// If redis is running in mock mode (does not have options object from ioredis), fallback to mock queue processing
if (!redis.options) {
  useQueueMocks = true;
  console.log('ℹ️ BullMQ queues running in inline mock mode');
} else {
  try {
    trustScoreQueue = new Queue(QUEUE_NAMES.TRUST_SCORE, {
      connection: redis,
      defaultJobOptions,
    });

    resumeAnalysisQueue = new Queue(QUEUE_NAMES.RESUME_ANALYSIS, {
      connection: redis,
      defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
    });

    matchScoreQueue = new Queue(QUEUE_NAMES.MATCH_SCORE, {
      connection: redis,
      defaultJobOptions: { ...defaultJobOptions, backoff: { type: 'exponential', delay: 2000 } },
    });

    emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: redis,
      defaultJobOptions: { ...defaultJobOptions, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 500 },
    });
  } catch (err) {
    useQueueMocks = true;
    console.log('ℹ️ BullMQ queues running in inline mock mode (initialization failed)');
  }
}

// ── Dispatch helpers ───────────────────────────────────────────────

async function enqueueTrustScore(payload) {
  if (useQueueMocks) {
    const score = payload.description.length < 100 ? 35 : 85;
    const status = score <= 40 ? 'QUARANTINED' : 'ACTIVE';
    const flags = score <= 40 
      ? ['Vague job description: description is too short (under 100 chars).']
      : [];
    
    // Simulate AI delay
    setTimeout(async () => {
      try {
        await db.update(jobListings)
          .set({ trustScore: score, status, trustFlags: flags })
          .where(eq(jobListings.id, payload.jobId));
        console.log(`ℹ️ Mock AI Queue: Computed trust score for job ${payload.jobId}: ${score} (${status})`);
      } catch (err) {
        console.error('❌ Mock AI Queue Error updating trust score:', err.message);
      }
    }, 1000);
    return;
  }
  await trustScoreQueue.add('compute', payload, { jobId: `trust:${payload.jobId}` });
}

async function enqueueResumeAnalysis(payload) {
  if (useQueueMocks) {
    // Simulate analysis delay
    setTimeout(async () => {
      try {
        const { ResumeAnalysis } = require('./mongodb');
        await ResumeAnalysis.create({
          candidate_id: payload.candidateId,
          file_url: payload.resumeUrl,
          overall_score: 82,
          ats_score: 85,
          strengths: [
            'Clean structure and layout',
            'Strong list of relevant technical skills',
            'Descriptive professional summary section'
          ],
          weaknesses: [
            'Missing quantitative metrics (e.g. percentages or numbers for achievements)',
            'Brief employment gap in 2024 (approx. 6 months)'
          ],
          suggestions: [
            { priority: 1, text: 'Include specific numbers and metrics for project outcomes.' },
            { priority: 2, text: 'Add a section for certifications and professional development.' }
          ],
          missing_keywords: ['System Design', 'CI/CD', 'Scalability'],
          integrity_flags: ['Unexplained employment gap in 2024'],
          target_role: 'Full Stack Developer',
        });
        console.log(`ℹ️ Mock AI Queue: Completed resume analysis for candidate ${payload.candidateId}`);
      } catch (err) {
        console.error('❌ Mock AI Queue Error writing resume analysis:', err.message);
      }
    }, 1000);
    return;
  }
  await resumeAnalysisQueue.add('analyze', payload, {
    jobId: `resume:${payload.candidateId}:${Date.now()}`,
  });
}

async function enqueueMatchScore(payload) {
  if (useQueueMocks) {
    const score = 78.5;
    setTimeout(async () => {
      try {
        await redis.setex(RedisKeys.matchScore(payload.candidateId, payload.jobId), 1800, String(score));
        await db.update(applications)
          .set({ matchScore: score })
          .where(
            and(
              eq(applications.candidateId, payload.candidateId),
              eq(applications.jobId, payload.jobId)
            )
          );
        console.log(`ℹ️ Mock AI Queue: Computed match score for ${payload.candidateId} vs ${payload.jobId}: ${score}%`);
      } catch (err) {
        console.error('❌ Mock AI Queue Error writing match score:', err.message);
      }
    }, 1000);
    return;
  }
  await matchScoreQueue.add('match', payload, {
    jobId: `match:${payload.candidateId}:${payload.jobId}`,
  });
}

async function enqueueEmail(payload) {
  if (useQueueMocks) {
    console.log(`✉️ [Mock Email Dispatcher] to: ${payload.toEmail || payload.email}, type: ${payload.type}`);
    return;
  }
  await emailQueue.add('send', payload);
}

module.exports = {
  QUEUE_NAMES,
  trustScoreQueue,
  resumeAnalysisQueue,
  matchScoreQueue,
  emailQueue,
  enqueueTrustScore,
  enqueueResumeAnalysis,
  enqueueMatchScore,
  enqueueEmail,
};

