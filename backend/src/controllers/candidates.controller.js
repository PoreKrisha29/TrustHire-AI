const { db } = require('../config/database');
const { redis, RedisKeys } = require('../config/redis');
const { candidateProfiles, jobListings, applications, employerProfiles } = require('../db/schema');
const { uploadToS3 } = require('../config/s3');
const { enqueueResumeAnalysis } = require('../config/queue');
const { ResumeAnalysis } = require('../config/mongodb');
const { ErrorCodes } = require('../constants/errorCodes');
const { eq, desc, asc, sql, and, gte, count } = require('drizzle-orm');

/**
 * GET /api/candidates/me
 */
async function getMyProfile(req, res, next) {
  try {
    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Profile not found', code: ErrorCodes.NOT_FOUND, message: 'Candidate profile not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/candidates/me
 */
async function updateMyProfile(req, res, next) {
  try {
    const existing = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!existing[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Candidate profile not found.' });
    }

    const merged = { ...existing[0], ...req.body };
    const [updated] = await db
      .update(candidateProfiles)
      .set({
        ...req.body,
        completenessScore: computeCompleteness(merged),
      })
      .where(eq(candidateProfiles.userId, req.user.userId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/candidates/me/resume
 */
async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file', code: ErrorCodes.VALIDATION_ERROR, message: 'Please attach a resume file (PDF or DOCX).' });
    }

    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Candidate profile not found.' });
    }
    const candidate = rows[0];

    const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : 'docx';
    const s3Key = `resumes/${candidate.id}/${Date.now()}.${ext}`;

    await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

    const newScore = computeCompleteness({ ...candidate, resumeUrl: s3Key });
    await db
      .update(candidateProfiles)
      .set({ resumeUrl: s3Key, completenessScore: newScore })
      .where(eq(candidateProfiles.id, candidate.id));

    // Dispatch resume analysis job
    await enqueueResumeAnalysis({ candidateId: candidate.id, resumeUrl: s3Key });

    res.json({ success: true, data: { resumeUrl: s3Key }, message: 'Your resume has been uploaded. Analysis will be ready shortly.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/candidates/me/resume/analysis
 */
async function getLatestResumeAnalysis(req, res, next) {
  try {
    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }

    const analysis = await ResumeAnalysis
      .findOne({ candidate_id: rows[0].id })
      .sort({ analyzed_at: -1 });

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'No resume analysis found. Please upload a resume first.' });
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/candidates/me/resume/analysis/status
 */
async function getAnalysisStatus(req, res, next) {
  try {
    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }
    const candidate = rows[0];

    const analysis = await ResumeAnalysis
      .findOne({ candidate_id: candidate.id })
      .sort({ analyzed_at: -1 });

    const isProcessing = candidate.resumeUrl && !analysis;

    res.json({
      success: true,
      data: {
        status: isProcessing ? 'PROCESSING' : analysis ? 'COMPLETE' : 'NONE',
        analyzedAt: analysis ? analysis.analyzed_at : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/candidates/me/applications
 */
async function getMyApplications(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;

    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }
    const candidate = rows[0];

    const [appsRows, totalRows] = await Promise.all([
      db
        .select({
          id:          applications.id,
          status:      applications.status,
          matchScore:  applications.matchScore,
          appliedAt:   applications.appliedAt,
          updatedAt:   applications.updatedAt,
          jobId:       applications.jobId,
          title:       jobListings.title,
          jobType:     jobListings.jobType,
          location:    jobListings.location,
          trustScore:  jobListings.trustScore,
          companyName: employerProfiles.companyName,
          logoUrl:     employerProfiles.logoUrl,
          verified:    employerProfiles.verified,
        })
        .from(applications)
        .leftJoin(jobListings, eq(applications.jobId, jobListings.id))
        .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
        .where(eq(applications.candidateId, candidate.id))
        .orderBy(desc(applications.appliedAt))
        .limit(limit)
        .offset(skip),
      db
        .select({ count: sql`count(*)` })
        .from(applications)
        .where(eq(applications.candidateId, candidate.id)),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items: appsRows, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/candidates/me/matches — top-10 recommended jobs
 */
async function getRecommendedJobs(req, res, next) {
  try {
    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }
    const candidate = rows[0];

    // Check Redis cache first
    const cached = await redis.get(RedisKeys.recommended(candidate.id));
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached), source: 'cache' });
    }

    // Fallback: return recent active listings (until AI matching is ready)
    const jobs = await db
      .select({
        id:          jobListings.id,
        title:       jobListings.title,
        jobType:     jobListings.jobType,
        location:    jobListings.location,
        salaryMin:   jobListings.salaryMin,
        salaryMax:   jobListings.salaryMax,
        trustScore:  jobListings.trustScore,
        createdAt:   jobListings.createdAt,
        companyName: employerProfiles.companyName,
        logoUrl:     employerProfiles.logoUrl,
        verified:    employerProfiles.verified,
      })
      .from(jobListings)
      .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
      .where(eq(jobListings.status, 'ACTIVE'))
      .orderBy(desc(jobListings.trustScore))
      .limit(10);

    await redis.setex(RedisKeys.recommended(candidate.id), 1800, JSON.stringify(jobs));
    res.json({ success: true, data: jobs, source: 'db' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/candidates/me/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const rows = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }
    const candidate = rows[0];

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalAppsRows, recentApps, latestAnalysis, newJobsRows] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(applications).where(eq(applications.candidateId, candidate.id)),
      db
        .select({
          id:          applications.id,
          status:      applications.status,
          matchScore:  applications.matchScore,
          appliedAt:   applications.appliedAt,
          title:       jobListings.title,
          companyName: employerProfiles.companyName,
          verified:    employerProfiles.verified,
        })
        .from(applications)
        .leftJoin(jobListings, eq(applications.jobId, jobListings.id))
        .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
        .where(eq(applications.candidateId, candidate.id))
        .orderBy(desc(applications.appliedAt))
        .limit(5),
      ResumeAnalysis.findOne({ candidate_id: candidate.id }).sort({ analyzed_at: -1 }),
      db
        .select({ count: sql`count(*)` })
        .from(jobListings)
        .where(and(eq(jobListings.status, 'ACTIVE'), gte(jobListings.createdAt, oneWeekAgo))),
    ]);

    res.json({
      success: true,
      data: {
        profileCompleteness:  candidate.completenessScore,
        totalApplications:    parseInt(totalAppsRows[0]?.count ?? 0, 10),
        newJobsThisWeek:      parseInt(newJobsRows[0]?.count ?? 0, 10),
        resumeScore:          latestAnalysis ? latestAnalysis.overall_score : null,
        recentApplications:   recentApps,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function computeCompleteness(profile) {
  let score = 0;
  if (profile.fullName)                                                             score += 15;
  if (profile.location)                                                             score += 10;
  if (profile.jobTitle)                                                             score += 15;
  if (Array.isArray(profile.skills) && profile.skills.length >= 3)                 score += 20;
  if (profile.yearsExperience != null)                                              score += 10;
  if (Array.isArray(profile.preferredJobTypes) && profile.preferredJobTypes.length >= 1) score += 10;
  if (profile.resumeUrl)                                                            score += 20;
  return Math.min(100, score);
}

module.exports = {
  getMyProfile, updateMyProfile, uploadResume,
  getLatestResumeAnalysis, getAnalysisStatus,
  getMyApplications, getRecommendedJobs, getDashboard,
};
