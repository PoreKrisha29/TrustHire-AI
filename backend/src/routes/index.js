const { Router } = require('express');
const authRoutes      = require('./auth.routes');
const jobRoutes       = require('./jobs.routes');
const candidateRoutes = require('./candidates.routes');
const employerRoutes  = require('./employers.routes');
const companyRoutes   = require('./companies.routes');
const assistantRoutes = require('./assistant.routes');
const adminRoutes     = require('./admin.routes');

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString(), service: 'TrustHire AI Backend' } });
});

// Feature routes
router.use('/auth',       authRoutes);
router.use('/jobs',       jobRoutes);
router.use('/candidates', candidateRoutes);
router.use('/employers',  employerRoutes);
router.use('/companies',  companyRoutes);
router.use('/assistant',  assistantRoutes);
router.use('/admin',      adminRoutes);

module.exports = router;
