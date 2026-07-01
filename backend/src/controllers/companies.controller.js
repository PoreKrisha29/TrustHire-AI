const { db } = require('../config/database');
const { companyVerifications, employerProfiles, jobListings } = require('../db/schema');
const { uploadToS3 } = require('../config/s3');
const { ResumeAnalysis } = require('../config/mongodb');
const { ErrorCodes } = require('../constants/errorCodes');
const { eq, and } = require('drizzle-orm');
const dns = require('dns').promises;
const https = require('https');

/** POST /api/companies/me/verify */
async function submitVerification(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document', code: ErrorCodes.VALIDATION_ERROR, message: 'Please upload your business registration certificate (PDF).' });
    }

    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!employer) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Employer profile not found.' });

    const [existing] = await db
      .select()
      .from(companyVerifications)
      .where(eq(companyVerifications.employerId, employer.id))
      .limit(1);

    if (existing && existing.status === 'PENDING') {
      return res.status(409).json({ success: false, error: 'Already submitted', code: ErrorCodes.DUPLICATE, message: 'A verification request is already pending review.' });
    }

    const s3Key = `verifications/${employer.id}/${Date.now()}.pdf`;
    await uploadToS3(s3Key, req.file.buffer, 'application/pdf');

    const { registrationNumber, websiteUrl, linkedinUrl } = req.body;

    let verification;
    if (existing) {
      // Update existing (re-submission)
      [verification] = await db
        .update(companyVerifications)
        .set({
          status: 'PENDING', registrationNumber, documentUrl: s3Key,
          websiteUrl, linkedinUrl, verificationChecks: {}, adminNotes: null, verifiedAt: null, adminId: null,
        })
        .where(eq(companyVerifications.id, existing.id))
        .returning();
    } else {
      [verification] = await db
        .insert(companyVerifications)
        .values({ employerId: employer.id, status: 'PENDING', registrationNumber, documentUrl: s3Key, websiteUrl, linkedinUrl, verificationChecks: {} })
        .returning();
    }

    // Run automated checks in background (non-blocking)
    runAutomatedChecks(verification.id, websiteUrl, linkedinUrl).catch(console.error);

    res.status(202).json({
      success: true,
      data: { verificationId: verification.id, status: 'PENDING' },
      message: 'Verification request submitted. Automated checks are running. Admin review typically takes 1–2 business days.',
    });
  } catch (err) { next(err); }
}

/** GET /api/companies/me/verify/status */
async function getVerificationStatus(req, res, next) {
  try {
    const [employer] = await db
      .select()
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, req.user.userId))
      .limit(1);

    if (!employer) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Profile not found.' });

    const [verification] = await db
      .select()
      .from(companyVerifications)
      .where(eq(companyVerifications.employerId, employer.id))
      .limit(1);

    if (!verification) return res.json({ success: true, data: { status: 'NOT_SUBMITTED' } });
    res.json({ success: true, data: verification });
  } catch (err) { next(err); }
}

/** GET /api/companies/:employerProfileId */
async function getPublicProfile(req, res, next) {
  try {
    const [employer] = await db
      .select({
        id: employerProfiles.id, companyName: employerProfiles.companyName,
        website: employerProfiles.website, industry: employerProfiles.industry,
        companySize: employerProfiles.companySize, location: employerProfiles.location,
        description: employerProfiles.description, logoUrl: employerProfiles.logoUrl,
        verified: employerProfiles.verified,
      })
      .from(employerProfiles)
      .where(eq(employerProfiles.id, req.params.employerProfileId))
      .limit(1);

    if (!employer) return res.status(404).json({ success: false, error: 'Not found', code: ErrorCodes.NOT_FOUND, message: 'Company not found.' });
    res.json({ success: true, data: employer });
  } catch (err) { next(err); }
}

/** POST /api/companies/internal/trust-score-result — Python AI service callback */
async function receiveTrustScoreResult(req, res, next) {
  try {
    const { jobId, score, flags, status } = req.body;
    if (!jobId || score == null) {
      return res.status(400).json({ success: false, error: 'Invalid payload', code: ErrorCodes.VALIDATION_ERROR, message: 'jobId and score are required.' });
    }

    await db
      .update(jobListings)
      .set({
        trustScore: Math.min(100, Math.max(0, Math.round(score))),
        trustFlags: flags || [],
        status:     status === 'QUARANTINED' ? 'QUARANTINED' : 'ACTIVE',
      })
      .where(eq(jobListings.id, jobId));

    res.json({ success: true, data: null, message: 'Trust score updated.' });
  } catch (err) { next(err); }
}

/** POST /api/companies/internal/resume-analysis-result — Python AI service callback */
async function receiveResumeAnalysisResult(req, res, next) {
  try {
    const { candidateId, fileUrl, overallScore, atsScore, strengths, weaknesses, suggestions, missingKeywords, integrityFlags, targetRole } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'Invalid payload', code: ErrorCodes.VALIDATION_ERROR, message: 'candidateId is required.' });
    }

    // ResumeAnalysis.create() now handles the 3-report limit internally
    await ResumeAnalysis.create({
      candidate_id:     candidateId,
      file_url:         fileUrl,
      overall_score:    overallScore,
      ats_score:        atsScore,
      strengths:        strengths || [],
      weaknesses:       weaknesses || [],
      suggestions:      suggestions || [],
      missing_keywords: missingKeywords || [],
      integrity_flags:  integrityFlags || [],
      target_role:      targetRole || null,
    });

    res.json({ success: true, data: null, message: 'Resume analysis stored.' });
  } catch (err) { next(err); }
}

// ── Background: Automated Verification Checks ─────────────────────

async function runAutomatedChecks(verificationId, websiteUrl, linkedinUrl) {
  const checks = {};

  if (websiteUrl) {
    try {
      const hostname = new URL(websiteUrl).hostname;
      await dns.lookup(hostname);
      checks.dns_lookup = { passed: true, checked_at: new Date().toISOString() };
    } catch {
      checks.dns_lookup = { passed: false, reason: 'DNS lookup failed', checked_at: new Date().toISOString() };
    }

    try {
      const statusCode = await httpPing(websiteUrl);
      checks.http_ping = { passed: statusCode >= 200 && statusCode < 400, status_code: statusCode, checked_at: new Date().toISOString() };
    } catch {
      checks.http_ping = { passed: false, reason: 'HTTP ping timed out or failed', checked_at: new Date().toISOString() };
    }
  }

  if (linkedinUrl) {
    const isLinkedIn = /^https:\/\/(www\.)?linkedin\.com\/company\/.+/.test(linkedinUrl);
    checks.linkedin_format = { passed: isLinkedIn, checked_at: new Date().toISOString() };
  }

  await db
    .update(companyVerifications)
    .set({ verificationChecks: checks })
    .where(eq(companyVerifications.id, verificationId));
}

function httpPing(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      resolve(res.statusCode);
      res.destroy();
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

module.exports = { submitVerification, getVerificationStatus, getPublicProfile, receiveTrustScoreResult, receiveResumeAnalysisResult };
