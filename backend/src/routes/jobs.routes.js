const { Router } = require('express');
const { z } = require('zod');
const JobsController  = require('../controllers/jobs.controller');
const { authenticate, requireEmployer } = require('../middleware/auth.middleware');
const { validateBody, parsePagination } = require('../middleware/validate.middleware');

const router = Router();

const createJobSchema = z.object({
  title:        z.string().min(5, 'Title must be at least 5 characters').max(255),
  description:  z.string().min(50, 'Description must be at least 50 characters'),
  requirements: z.string().optional(),
  location:     z.string().max(255).optional(),
  jobType:      z.enum(['FULL_TIME', 'PART_TIME', 'REMOTE', 'CONTRACT']),
  salaryMin:    z.number().int().min(0).optional().nullable(),
  salaryMax:    z.number().int().min(0).optional().nullable(),
});

const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'HIRED', 'REJECTED']),
});

// Public routes
router.get('/',     parsePagination, JobsController.listJobs);
router.get('/:id',                  JobsController.getJob);

// Candidate routes (requires auth, any role)
router.post('/:id/apply',    authenticate, JobsController.applyToJob);
router.delete('/:id/apply',  authenticate, JobsController.withdrawApplication);

// Employer routes
router.post('/',                   authenticate, requireEmployer, validateBody(createJobSchema),  JobsController.createJob);
router.put('/:id',                 authenticate, requireEmployer, validateBody(updateJobSchema),  JobsController.updateJob);
router.delete('/:id',              authenticate, requireEmployer,                                  JobsController.deleteJob);
router.get('/:id/applicants',      authenticate, requireEmployer, parsePagination,                 JobsController.listApplicants);
router.patch('/:id/applicants/:applicantId/status', authenticate, requireEmployer, validateBody(updateStatusSchema), JobsController.updateApplicationStatus);

module.exports = router;
