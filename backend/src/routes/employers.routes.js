const { Router } = require('express');
const { z } = require('zod');
const EmployersController = require('../controllers/employers.controller');
const { authenticate, requireEmployer } = require('../middleware/auth.middleware');
const { validateBody, parsePagination } = require('../middleware/validate.middleware');
const { logoUpload, handleMulterError } = require('../middleware/upload.middleware');
const { uploadRateLimiter } = require('../middleware/rateLimiter.middleware');

const router = Router();

const updateProfileSchema = z.object({
  companyName:  z.string().min(2).max(255).optional(),
  website:      z.string().url('Must be a valid URL starting with http:// or https://').optional().nullable(),
  industry:     z.string().max(100).optional().nullable(),
  companySize:  z.enum(['1-10','11-50','51-200','201-500','500+']).optional().nullable(),
  location:     z.string().max(255).optional().nullable(),
  description:  z.string().max(2000).optional().nullable(),
});

router.get( '/me',           authenticate, requireEmployer,                                           EmployersController.getMyProfile);
router.put( '/me',           authenticate, requireEmployer, validateBody(updateProfileSchema),        EmployersController.updateMyProfile);
router.post('/me/logo',      authenticate, requireEmployer, uploadRateLimiter, logoUpload.single('logo'), handleMulterError, EmployersController.uploadLogo);
router.get( '/me/listings',  authenticate, requireEmployer, parsePagination,                          EmployersController.getMyListings);
router.get( '/me/dashboard', authenticate, requireEmployer,                                           EmployersController.getDashboard);

module.exports = router;
