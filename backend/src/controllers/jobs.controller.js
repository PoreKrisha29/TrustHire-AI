const { db } = require('../config/database');
const { redis, RedisKeys } = require('../config/redis');
const {
  jobListings, applications, employerProfiles, candidateProfiles, auditLog,
} = require('../db/schema');
const { enqueueTrustScore, enqueueMatchScore } = require('../config/queue');
const { ErrorCodes, APP_STATUS_TRANSITIONS } = require('../constants/errorCodes');
const { eq, desc, asc, and, or, ilike, gte, lte, sql } = require('drizzle-orm');

/**
 * GET /api/jobs
 * Public job board — returns ACTIVE listings only.
 */
async function listJobs(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;
    const { q, location, jobType, minTrust, maxTrust, verifiedOnly, sortBy } = req.query;

    // Build WHERE conditions
    const conditions = [eq(jobListings.status, 'ACTIVE')];

    if (location)    conditions.push(ilike(jobListings.location, `%${location}%`));
    if (jobType)     conditions.push(eq(jobListings.jobType, jobType));
    if (minTrust)    conditions.push(gte(jobListings.trustScore, parseInt(minTrust, 10)));
    if (maxTrust)    conditions.push(lte(jobListings.trustScore, parseInt(maxTrust, 10)));

    // Text search across title and description
    const whereClause = q
      ? and(...conditions, or(ilike(jobListings.title, `%${q}%`), ilike(jobListings.description, `%${q}%`)))
      : and(...conditions);

    const orderBy = sortBy === 'trustScore'
      ? desc(jobListings.trustScore)
      : desc(jobListings.createdAt);

    const [jobs, totalRows] = await Promise.all([
      db
        .select({
          id:          jobListings.id,
          title:       jobListings.title,
          description: jobListings.description,
          location:    jobListings.location,
          jobType:     jobListings.jobType,
          salaryMin:   jobListings.salaryMin,
          salaryMax:   jobListings.salaryMax,
          status:      jobListings.status,
          trustScore:  jobListings.trustScore,
          trustFlags:  jobListings.trustFlags,
          createdAt:   jobListings.createdAt,
          employerId:  jobListings.employerId,
          companyName: employerProfiles.companyName,
          logoUrl:     employerProfiles.logoUrl,
          verified:    employerProfiles.verified,
          empLocation: employerProfiles.location,
        })
        .from(jobListings)
        .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
        .where(verifiedOnly === 'true'
          ? and(whereClause, eq(employerProfiles.verified, true))
          : whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(jobListings).where(whereClause),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);

    res.json({
      success: true,
      data: {
        items: jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:id
 */
async function getJob(req, res, next) {
  try {
    const rows = await db
      .select({
        id:           jobListings.id,
        title:        jobListings.title,
        description:  jobListings.description,
        requirements: jobListings.requirements,
        location:     jobListings.location,
        jobType:      jobListings.jobType,
        salaryMin:    jobListings.salaryMin,
        salaryMax:    jobListings.salaryMax,
        status:       jobListings.status,
        trustScore:   jobListings.trustScore,
        trustFlags:   jobListings.trustFlags,
        createdAt:    jobListings.createdAt,
        updatedAt:    jobListings.updatedAt,
        employerId:   jobListings.employerId,
        employerUserId: employerProfiles.userId,
        companyName:  employerProfiles.companyName,
        logoUrl:      employerProfiles.logoUrl,
        verified:     employerProfiles.verified,
        empLocation:  employerProfiles.location,
        industry:     employerProfiles.industry,
        website:      employerProfiles.website,
        description2: employerProfiles.description,
      })
      .from(jobListings)
      .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job listing not found.' });
    }

    const job = rows[0];

    // Only show non-ACTIVE listings to the employer who owns them
    if (job.status !== 'ACTIVE') {
      if (!req.user || req.user.userId !== job.employerUserId) {
        return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job listing not found.' });
      }
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/jobs
 */
async function createJob(req, res, next) {
  try {
    const empRows = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!empRows[0]) {
      return res.status(404).json({ success: false, error: 'Profile not found', code: ErrorCodes.NOT_FOUND, message: 'Please complete your employer profile before posting a job.' });
    }
    const employer = empRows[0];

    const { salaryMin, salaryMax } = req.body;
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      return res.status(400).json({ success: false, error: 'Invalid salary range', code: ErrorCodes.VALIDATION_ERROR, message: 'Minimum salary cannot exceed maximum salary.' });
    }

    const [job] = await db.insert(jobListings).values({
      employerId:   employer.id,
      ...req.body,
      status:       'PROCESSING',
      trustScore:   null,
      trustFlags:   [],
    }).returning();

    // Dispatch trust score job
    const domain = employer.website ? new URL(employer.website).hostname : null;
    await enqueueTrustScore({
      jobId:              job.id,
      title:              job.title,
      description:        job.description,
      salaryMin:          job.salaryMin,
      salaryMax:          job.salaryMax,
      domain,
      employerId:         employer.id,
      isVerifiedCompany:  employer.verified,
    });

    res.status(202).json({
      success: true,
      data: job,
      message: 'Job listing created. Trust Score is being computed (usually takes under 60 seconds).',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/jobs/:id
 */
async function updateJob(req, res, next) {
  try {
    const jobRows = await db
      .select({ id: jobListings.id, employerUserId: employerProfiles.userId })
      .from(jobListings)
      .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!jobRows[0] || jobRows[0].employerUserId !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job listing not found or you do not own it.' });
    }

    const [updated] = await db
      .update(jobListings)
      .set(req.body)
      .where(eq(jobListings.id, req.params.id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/jobs/:id — sets status to CLOSED
 */
async function deleteJob(req, res, next) {
  try {
    const jobRows = await db
      .select({ id: jobListings.id, employerUserId: employerProfiles.userId })
      .from(jobListings)
      .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!jobRows[0] || jobRows[0].employerUserId !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job listing not found.' });
    }

    await db.update(jobListings).set({ status: 'CLOSED' }).where(eq(jobListings.id, req.params.id));
    res.json({ success: true, data: null, message: 'Job listing closed.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/jobs/:id/apply
 */
async function applyToJob(req, res, next) {
  try {
    if (req.user.role !== 'CANDIDATE') {
      return res.status(403).json({ success: false, error: 'Forbidden', code: ErrorCodes.FORBIDDEN, message: 'Only candidates can apply to jobs.' });
    }

    const [candidate] = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Profile not found', code: ErrorCodes.NOT_FOUND, message: 'Please complete your candidate profile before applying.' });
    }

    const [job] = await db
      .select()
      .from(jobListings)
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!job || job.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'This job listing is not available.' });
    }

    // Duplicate guard
    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.candidateId, candidate.id), eq(applications.jobId, job.id)))
      .limit(1);

    if (existing[0]) {
      return res.status(409).json({ success: false, error: 'Already applied', code: ErrorCodes.DUPLICATE, message: 'You have already applied to this role.' });
    }

    // Get cached match score if available
    const cachedScore = await redis.get(RedisKeys.matchScore(candidate.id, job.id));
    const matchScore = cachedScore ? parseFloat(cachedScore) : null;

    const [application] = await db.insert(applications).values({
      candidateId: candidate.id,
      jobId:       job.id,
      matchScore,
    }).returning();

    // Enqueue match score computation if not cached
    if (!matchScore) {
      await enqueueMatchScore({ candidateId: candidate.id, jobId: job.id });
    }

    res.status(201).json({ success: true, data: application, message: 'Application submitted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/jobs/:id/apply — withdraw application
 */
async function withdrawApplication(req, res, next) {
  try {
    const [candidate] = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, req.user.userId))
      .limit(1);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });
    }

    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.candidateId, candidate.id), eq(applications.jobId, req.params.id)))
      .limit(1);

    if (!application || application.status === 'WITHDRAWN') {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Application not found.' });
    }

    if (['HIRED', 'REJECTED'].includes(application.status)) {
      return res.status(400).json({ success: false, error: 'Cannot withdraw', code: ErrorCodes.VALIDATION_ERROR, message: `Cannot withdraw an application with status: ${application.status}` });
    }

    await db.update(applications).set({ status: 'WITHDRAWN' }).where(eq(applications.id, application.id));

    res.json({ success: true, data: null, message: 'Application withdrawn.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:id/applicants
 */
async function listApplicants(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;

    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    const [job] = await db
      .select()
      .from(jobListings)
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!job || job.employerId !== employer.id) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job listing not found.' });
    }

    const [appRows, totalRows] = await Promise.all([
      db
        .select({
          id:               applications.id,
          status:           applications.status,
          matchScore:       applications.matchScore,
          appliedAt:        applications.appliedAt,
          updatedAt:        applications.updatedAt,
          candidateId:      applications.candidateId,
          cFullName:        candidateProfiles.fullName,
          cLocation:        candidateProfiles.location,
          cJobTitle:        candidateProfiles.jobTitle,
          cSkills:          candidateProfiles.skills,
          cYearsExp:        candidateProfiles.yearsExperience,
          cCompleteness:    candidateProfiles.completenessScore,
        })
        .from(applications)
        .leftJoin(candidateProfiles, eq(applications.candidateId, candidateProfiles.id))
        .where(eq(applications.jobId, job.id))
        .orderBy(desc(applications.matchScore))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(applications).where(eq(applications.jobId, job.id)),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);

    // Mask candidate data below SHORTLISTED status
    const items = appRows.map((app) => ({
      id:         app.id,
      status:     app.status,
      matchScore: app.matchScore,
      appliedAt:  app.appliedAt,
      updatedAt:  app.updatedAt,
      candidate: {
        id:               app.candidateId,
        fullName:         app.cFullName,
        location:         app.cLocation,
        jobTitle:         app.cJobTitle,
        skills:           app.cSkills,
        yearsExperience:  app.cYearsExp,
        completenessScore: app.cCompleteness,
      },
    }));

    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/jobs/:id/applicants/:applicantId/status
 */
async function updateApplicationStatus(req, res, next) {
  try {
    const { status: newStatus } = req.body;

    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    const [job] = await db
      .select()
      .from(jobListings)
      .where(eq(jobListings.id, req.params.id))
      .limit(1);

    if (!job || job.employerId !== employer.id) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Job not found.' });
    }

    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, req.params.applicantId))
      .limit(1);

    if (!application || application.jobId !== job.id) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Application not found.' });
    }

    const allowed = APP_STATUS_TRANSITIONS[application.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false, error: 'Invalid transition', code: ErrorCodes.VALIDATION_ERROR,
        message: `Cannot transition from ${application.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
      });
    }

    const [updated] = await db
      .update(applications)
      .set({ status: newStatus })
      .where(eq(applications.id, application.id))
      .returning();

    res.json({ success: true, data: updated, message: `Application status updated to ${newStatus}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listJobs, getJob, createJob, updateJob, deleteJob,
  applyToJob, withdrawApplication, listApplicants, updateApplicationStatus,
};
