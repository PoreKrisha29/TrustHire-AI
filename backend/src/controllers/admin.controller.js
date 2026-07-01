const { db } = require('../config/database');
const { redis, RedisKeys } = require('../config/redis');
const {
  users, jobListings, applications, companyVerifications, auditLog, employerProfiles,
} = require('../db/schema');
const { ErrorCodes } = require('../constants/errorCodes');
const { eq, desc, asc, sql, and } = require('drizzle-orm');
const emailService = require('../config/email.service');

/** GET /api/admin/stats */
async function getStats(req, res, next) {
  try {
    const cached = await redis.get(RedisKeys.adminStats());
    if (cached) return res.json({ success: true, data: JSON.parse(cached), source: 'cache' });

    const [totalUsersRows, totalJobsRows, activeJobsRows, quarantinedRows, totalAppsRows, pendingVerRows] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(users),
      db.select({ count: sql`count(*)` }).from(jobListings),
      db.select({ count: sql`count(*)` }).from(jobListings).where(eq(jobListings.status, 'ACTIVE')),
      db.select({ count: sql`count(*)` }).from(jobListings).where(eq(jobListings.status, 'QUARANTINED')),
      db.select({ count: sql`count(*)` }).from(applications),
      db.select({ count: sql`count(*)` }).from(companyVerifications).where(eq(companyVerifications.status, 'PENDING')),
    ]);

    const stats = {
      totalUsers:           parseInt(totalUsersRows[0]?.count ?? 0, 10),
      totalJobs:            parseInt(totalJobsRows[0]?.count ?? 0, 10),
      activeJobs:           parseInt(activeJobsRows[0]?.count ?? 0, 10),
      quarantinedJobs:      parseInt(quarantinedRows[0]?.count ?? 0, 10),
      totalApplications:    parseInt(totalAppsRows[0]?.count ?? 0, 10),
      pendingVerifications: parseInt(pendingVerRows[0]?.count ?? 0, 10),
    };

    await redis.setex(RedisKeys.adminStats(), 300, JSON.stringify(stats));
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

/** GET /api/admin/quarantine */
async function getQuarantineQueue(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id:          jobListings.id,
          title:       jobListings.title,
          trustScore:  jobListings.trustScore,
          trustFlags:  jobListings.trustFlags,
          status:      jobListings.status,
          createdAt:   jobListings.createdAt,
          companyName: employerProfiles.companyName,
          verified:    employerProfiles.verified,
          website:     employerProfiles.website,
        })
        .from(jobListings)
        .leftJoin(employerProfiles, eq(jobListings.employerId, employerProfiles.id))
        .where(eq(jobListings.status, 'QUARANTINED'))
        .orderBy(desc(jobListings.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(jobListings).where(eq(jobListings.status, 'QUARANTINED')),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

/** PATCH /api/admin/quarantine/:jobId */
async function actOnQuarantine(req, res, next) {
  try {
    const { action, notes } = req.body;

    const [job] = await db
      .select()
      .from(jobListings)
      .where(eq(jobListings.id, req.params.jobId))
      .limit(1);

    if (!job || job.status !== 'QUARANTINED') {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Quarantined listing not found.' });
    }

    const newStatus =
      action === 'APPROVE'          ? 'ACTIVE'   :
      action === 'REMOVE'           ? 'REMOVED'  :
      action === 'REQUEST_RESUBMIT' ? 'DRAFT'    : null;

    await db.update(jobListings).set({ status: newStatus }).where(eq(jobListings.id, job.id));

    await db.insert(auditLog).values({
      adminId:    req.user.userId,
      action:     action === 'APPROVE' ? 'APPROVE_LISTING' : action === 'REMOVE' ? 'REMOVE_LISTING' : 'REQUEST_RESUBMIT',
      targetType: 'job_listing',
      targetId:   job.id,
      metadata:   { notes: notes || null, previousStatus: 'QUARANTINED', newStatus },
    });

    await redis.del(RedisKeys.adminStats());
    res.json({ success: true, data: null, message: `Listing ${action.toLowerCase().replace('_', ' ')} successfully.` });
  } catch (err) { next(err); }
}

/** GET /api/admin/verifications */
async function getVerificationQueue(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id:                 companyVerifications.id,
          status:             companyVerifications.status,
          registrationNumber: companyVerifications.registrationNumber,
          documentUrl:        companyVerifications.documentUrl,
          websiteUrl:         companyVerifications.websiteUrl,
          linkedinUrl:        companyVerifications.linkedinUrl,
          verificationChecks: companyVerifications.verificationChecks,
          adminNotes:         companyVerifications.adminNotes,
          createdAt:          companyVerifications.createdAt,
          companyName:        employerProfiles.companyName,
          website:            employerProfiles.website,
          employerUserId:     employerProfiles.userId,
        })
        .from(companyVerifications)
        .leftJoin(employerProfiles, eq(companyVerifications.employerId, employerProfiles.id))
        .where(eq(companyVerifications.status, 'PENDING'))
        .orderBy(asc(companyVerifications.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(companyVerifications).where(eq(companyVerifications.status, 'PENDING')),
    ]);

    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

/** PATCH /api/admin/verifications/:id */
async function actOnVerification(req, res, next) {
  try {
    const { action, notes } = req.body;

    const rows = await db
      .select({
        id:          companyVerifications.id,
        employerId:  companyVerifications.employerId,
        status:      companyVerifications.status,
        companyName: employerProfiles.companyName,
      })
      .from(companyVerifications)
      .leftJoin(employerProfiles, eq(companyVerifications.employerId, employerProfiles.id))
      .where(eq(companyVerifications.id, req.params.id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Verification record not found.' });
    }
    if (action === 'REJECT' && !notes) {
      return res.status(400).json({ success: false, error: 'Notes required', code: ErrorCodes.VALIDATION_ERROR, message: 'Please provide rejection reason in notes.' });
    }

    const verification = rows[0];
    const isApproval = action === 'APPROVE';

    await db.update(companyVerifications).set({
      status:     isApproval ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'PENDING',
      adminId:    req.user.userId,
      adminNotes: notes || null,
      verifiedAt: isApproval ? new Date() : null,
    }).where(eq(companyVerifications.id, verification.id));

    if (isApproval) {
      await db.update(employerProfiles).set({ verified: true }).where(eq(employerProfiles.id, verification.employerId));
    }

    await db.insert(auditLog).values({
      adminId:    req.user.userId,
      action:     isApproval ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
      targetType: 'company_verification',
      targetId:   verification.id,
      metadata:   { notes: notes || null, companyName: verification.companyName },
    });

    await redis.del(RedisKeys.adminStats());

    // Send verification status email to employer
    try {
      const employerUser = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, verification.employerUserId || verification.employerId))
        .limit(1);

      if (employerUser[0]?.email) {
        await emailService.sendVerificationStatusEmail({
          to:          employerUser[0].email,
          companyName: verification.companyName || 'Your company',
          status:      isApproval ? 'VERIFIED' : 'REJECTED',
          reason:      notes || null,
          nextStepsUrl: null,
        });
      }
    } catch (emailErr) {
      console.warn('Verification email failed (non-fatal):', emailErr.message);
    }

    res.json({ success: true, data: null, message: `Verification ${action.toLowerCase()}d successfully.` });
  } catch (err) { next(err); }
}

/** GET /api/admin/users */
async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;
    const [userRows, totalRows] = await Promise.all([
      db
        .select({ id: users.id, email: users.email, role: users.role, emailVerified: users.emailVerified, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(users),
    ]);
    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items: userRows, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

/** GET /api/admin/audit */
async function getAuditLog(req, res, next) {
  try {
    const { page, limit, skip } = res.locals.pagination;
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id:         auditLog.id,
          action:     auditLog.action,
          targetType: auditLog.targetType,
          targetId:   auditLog.targetId,
          metadata:   auditLog.metadata,
          createdAt:  auditLog.createdAt,
          adminEmail: users.email,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.adminId, users.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ count: sql`count(*)` }).from(auditLog),
    ]);
    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

module.exports = { getStats, getQuarantineQueue, actOnQuarantine, getVerificationQueue, actOnVerification, listUsers, getAuditLog };
