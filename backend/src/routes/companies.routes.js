const { Router } = require('express');
const { z } = require('zod');
const CompaniesController = require('../controllers/companies.controller');
const { authenticate, requireEmployer, requireInternalKey } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { verificationDocUpload, handleMulterError } = require('../middleware/upload.middleware');
const { uploadRateLimiter } = require('../middleware/rateLimiter.middleware');

const router = Router();

const submitVerificationSchema = z.object({
  registrationNumber: z.string().max(100).optional(),
  websiteUrl:         z.string().url().optional(),
  linkedinUrl:        z.string().url().optional(),
});

// Employer: submit verification
router.post('/me/verify',        authenticate, requireEmployer, uploadRateLimiter, verificationDocUpload.single('document'), handleMulterError, validateBody(submitVerificationSchema), CompaniesController.submitVerification);
router.get( '/me/verify/status', authenticate, requireEmployer, CompaniesController.getVerificationStatus);

// Public: company profile
router.get('/:employerProfileId', CompaniesController.getPublicProfile);

// Internal callbacks (Python AI service → Node.js)
router.post('/internal/trust-score-result',    requireInternalKey, CompaniesController.receiveTrustScoreResult);
router.post('/internal/resume-analysis-result',requireInternalKey, CompaniesController.receiveResumeAnalysisResult);

module.exports = router;
