const { db } = require('../config/database');
const { employerProfiles, jobListings, applications } = require('../db/schema');
const { uploadToS3 } = require('../config/s3');
const { ErrorCodes } = require('../constants/errorCodes');
const { eq, desc, sql, and, gte } = require('drizzle-orm');

/** GET /api/employers/me */
async function getMyProfile(req, res, next) {
  try {
    const [profile] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!profile) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Employer profile not found.' });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

/** PUT /api/employers/me */
async function updateMyProfile(req, res, next) {
  try {
    const [updated] = await db
      .update(employerProfiles)
      .set(req.body)
      .where(eq(employerProfiles.userId, req.user.userId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

/** POST /api/employers/me/logo */
async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file', code: ErrorCodes.VALIDATION_ERROR, message: 'Please attach a logo image.' });

    const [profile] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!profile) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Employer profile not found.' });

    const ext = req.file.mimetype.split('/')[1];
    const s3Key = `logos/${profile.id}/${Date.now()}.${ext}`;
    await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

    await db.update(employerProfiles).set({ logoUrl: s3Key }).where(eq(employerProfiles.id, profile.id));
    res.json({ success: true, data: { logoUrl: s3Key }, message: 'Company logo updated.' });
  } catch (err) { next(err); }
}

/** GET /api/employers/me/listings */
async function getMyListings(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;

    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!employer) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });

    const [jobs, totalRows] = await Promise.all([
      db
        .select({
          id:         jobListings.id,
          title:      jobListings.title,
          jobType:    jobListings.jobType,
          location:   jobListings.location,
          status:     jobListings.status,
          trustScore: jobListings.trustScore,
          createdAt:  jobListings.createdAt,
          applicantCount: sql`(SELECT COUNT(*) FROM applications WHERE applications.job_id = job_listings.id)`,
        })
        .from(jobListings)
        .where(eq(jobListings.employerId, employer.id))
        .orderBy(desc(jobListings.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(jobListings).where(eq(jobListings.employerId, employer.id)),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items: jobs, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

/** GET /api/employers/me/dashboard */
async function getDashboard(req, res, next) {
  try {
    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!employer) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [activeRows, totalApplicantRows, weekApplicantRows] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(jobListings)
        .where(and(eq(jobListings.employerId, employer.id), eq(jobListings.status, 'ACTIVE'))),
      db.select({ count: sql`count(*)` }).from(applications)
        .leftJoin(jobListings, eq(applications.jobId, jobListings.id))
        .where(eq(jobListings.employerId, employer.id)),
      db.select({ count: sql`count(*)` }).from(applications)
        .leftJoin(jobListings, eq(applications.jobId, jobListings.id))
        .where(and(eq(jobListings.employerId, employer.id), gte(applications.appliedAt, oneWeekAgo))),
    ]);

    res.json({
      success: true,
      data: {
        activeListings:      parseInt(activeRows[0]?.count ?? 0, 10),
        totalApplicants:     parseInt(totalApplicantRows[0]?.count ?? 0, 10),
        applicantsThisWeek:  parseInt(weekApplicantRows[0]?.count ?? 0, 10),
        isVerified:          employer.verified,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { getMyProfile, updateMyProfile, uploadLogo, getMyListings, getDashboard };
