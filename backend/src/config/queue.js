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
    // Run asynchronously to simulate analysis queue
    setTimeout(async () => {
      try {
        const { ResumeAnalysis } = require('./mongodb');
        const { env } = require('./env');
        const path = require('path');
        const fs = require('fs');
        const axios = require('axios');
        const pdf = require('pdf-parse');

        const filePath = path.resolve(__dirname, '../../uploads', payload.resumeUrl);
        let extractedText = "";

        if (fs.existsSync(filePath)) {
          try {
            const buffer = fs.readFileSync(filePath);
            if (payload.resumeUrl.toLowerCase().endsWith('.pdf')) {
              const uint8Array = new Uint8Array(buffer);
              const parser = new pdf.PDFParse(uint8Array);
              const pdfData = await parser.getText();
              extractedText = pdfData.text || "";
            } else {
              // Basic raw fallback parsing for docx/txt files
              extractedText = buffer.toString('utf-8');
            }
          } catch (err) {
            console.error('⚠️ Failed to extract text from file:', err.message);
          }
        } else {
          console.warn('⚠️ Resume file not found on disk:', filePath);
        }

        // Try querying Gemini using gemini-2.0-flash model
        let parsedResult = null;
        if (extractedText.trim().length > 100 && env.GEMINI_API_KEY) {
          try {
            console.log(`ℹ️ Sending extracted resume text (${extractedText.length} chars) to Gemini API...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
            
            const prompt = `You are an expert resume parsing AI. Analyze the following resume text and parse it into structured JSON.
You MUST return a valid JSON object ONLY. Do not wrap in markdown or add explanations.

Expected Schema:
{
  "overall_score": 85, // integer 0-100
  "ats_score": 80, // integer 0-100
  "strengths": ["List 2-3 key strengths"],
  "weaknesses": ["List 1-2 weaknesses"],
  "suggestions": [
    { "priority": 1, "text": "Actionable suggestion" },
    { "priority": 2, "text": "Actionable suggestion" }
  ],
  "missing_keywords": ["List 2-4 missing key skills/technologies"],
  "integrity_flags": ["Any gaps or overlaps warnings"],
  "target_role": "Software Engineer", // primary role detected
  "parsedData": {
    "name": "Full Name",
    "email": "Email Address",
    "phone": "Phone Number",
    "location": "City, State",
    "summary": "Professional summary",
    "skills": ["Skill1", "Skill2", ...],
    "experience": [
      {
        "role": "Job Title",
        "company": "Company Name",
        "duration": "Duration (e.g. 2021 - Present)",
        "bullets": ["Achievement 1", "Achievement 2"]
      }
    ],
    "education": [
      {
        "degree": "Degree",
        "qualification": "Degree",
        "institution": "School",
        "school": "School",
        "year": "Graduation year"
      }
    ]
  }
}

Resume Text:
${extractedText}`;

            const response = await axios.post(url, {
              contents: [{ parts: [{ text: prompt }] }]
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000
            });

            const textResponse = response.data.candidates[0].content.parts[0].text.trim();
            const cleanJson = textResponse.replace(/^```json\s*|^```\s*|\s*```$/gi, '');
            parsedResult = JSON.parse(cleanJson);
            console.log(`✅ Mock AI Queue: Successfully parsed real resume for candidate ${payload.candidateId} using Gemini 2.0`);
          } catch (geminiErr) {
            console.error('⚠️ Gemini Resume Parsing failed, falling back to local heuristic parsing:', geminiErr.message);
          }
        }

        // Offline Fallback Heuristic Parser if Gemini failed or key was not present
        if (!parsedResult) {
          console.log(`ℹ️ Running local offline heuristic parser for candidate ${payload.candidateId}...`);
          const { extractDetailsFromText } = require('./helper_parser');
          parsedResult = extractDetailsFromText(extractedText || "Dev Pulse Candidate", payload.candidateId, payload.resumeUrl);
        }

        // Write resulting parsed resume details to Neon
        await ResumeAnalysis.create({
          candidate_id: payload.candidateId,
          file_url: payload.resumeUrl,
          overall_score: parsedResult.overall_score || 80,
          ats_score: parsedResult.ats_score || 80,
          strengths: parsedResult.strengths || [],
          weaknesses: parsedResult.weaknesses || [],
          suggestions: parsedResult.suggestions || [],
          missing_keywords: parsedResult.missing_keywords || [],
          integrity_flags: parsedResult.integrity_flags || [],
          target_role: parsedResult.target_role || 'Full Stack Developer',
          parsedData: parsedResult.parsedData
        });
        
        console.log(`ℹ️ Completed resume analysis for candidate ${payload.candidateId}`);
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

