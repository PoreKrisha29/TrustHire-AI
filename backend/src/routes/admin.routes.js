const { Router } = require('express');
const { z } = require('zod');
const AdminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validateBody, parsePagination } = require('../middleware/validate.middleware');

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireAdmin);

const quarantineActionSchema = z.object({
  action: z.enum(['APPROVE', 'REMOVE', 'REQUEST_RESUBMIT']),
  notes:  z.string().max(1000).optional(),
});

const verificationActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_DOCS']),
  notes:  z.string().max(1000).optional(),
});

router.get(  '/stats',                                                        AdminController.getStats);
router.get(  '/quarantine',          parsePagination,                         AdminController.getQuarantineQueue);
router.patch('/quarantine/:jobId',   validateBody(quarantineActionSchema),    AdminController.actOnQuarantine);
router.get(  '/verifications',       parsePagination,                         AdminController.getVerificationQueue);
router.patch('/verifications/:id',   validateBody(verificationActionSchema),  AdminController.actOnVerification);
router.get(  '/users',               parsePagination,                         AdminController.listUsers);
router.get(  '/audit',               parsePagination,                         AdminController.getAuditLog);

module.exports = router;
