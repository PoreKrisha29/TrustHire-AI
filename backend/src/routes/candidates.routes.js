const { Router } = require('express');
const { z } = require('zod');
const CandidatesController = require('../controllers/candidates.controller');
const { authenticate, requireCandidate } = require('../middleware/auth.middleware');
const { validateBody, parsePagination } = require('../middleware/validate.middleware');
const { resumeUpload, handleMulterError } = require('../middleware/upload.middleware');
const { uploadRateLimiter } = require('../middleware/rateLimiter.middleware');

const router = Router();

const updateProfileSchema = z.object({
  fullName:          z.string().min(2).max(255).optional(),
  location:          z.string().max(255).optional().nullable(),
  jobTitle:          z.string().max(255).optional().nullable(),
  skills:            z.array(z.string().max(50)).max(30).optional(),
  yearsExperience:   z.number().int().min(0).max(60).optional().nullable(),
  preferredJobTypes: z.array(z.enum(['FULL_TIME','PART_TIME','REMOTE','CONTRACT'])).optional(),
  visibility:        z.enum(['PUBLIC','PRIVATE']).optional(),
});

router.get( '/me',                    authenticate, requireCandidate,                                              CandidatesController.getMyProfile);
router.put( '/me',                    authenticate, requireCandidate, validateBody(updateProfileSchema),           CandidatesController.updateMyProfile);
router.post('/me/resume',             authenticate, requireCandidate, uploadRateLimiter, resumeUpload.single('resume'), handleMulterError, CandidatesController.uploadResume);
router.get( '/me/resume/analysis',    authenticate, requireCandidate,                                              CandidatesController.getLatestResumeAnalysis);
router.get( '/me/resume/analysis/status', authenticate, requireCandidate,                                         CandidatesController.getAnalysisStatus);
router.get( '/me/applications',       authenticate, requireCandidate, parsePagination,                             CandidatesController.getMyApplications);
router.get( '/me/matches',            authenticate, requireCandidate,                                              CandidatesController.getRecommendedJobs);
router.get( '/me/dashboard',          authenticate, requireCandidate,                                              CandidatesController.getDashboard);

module.exports = router;
