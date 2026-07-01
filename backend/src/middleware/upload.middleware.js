const multer = require('multer');
const { ErrorCodes } = require('../constants/errorCodes');

// All files stored in memory — we stream directly to S3, never write to disk
const storage = multer.memoryStorage();

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];

function resumeFilter(_req, file, cb) {
  if (ALLOWED_RESUME_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF and DOCX files are accepted'));
}

function imageFilter(_req, file, cb) {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG and WebP images are accepted'));
}

function documentFilter(_req, file, cb) {
  if (ALLOWED_DOC_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF documents are accepted'));
}

/** Resume: PDF or DOCX, max 5 MB */
const resumeUpload = multer({ storage, fileFilter: resumeFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/** Company logo: JPEG/PNG/WebP, max 2 MB */
const logoUpload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });

/** Verification doc: PDF only, max 10 MB */
const verificationDocUpload = multer({ storage, fileFilter: documentFilter, limits: { fileSize: 10 * 1024 * 1024 } });

/** Handle Multer errors and return consistent API error format */
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        code: ErrorCodes.FILE_TOO_LARGE,
        message: 'The uploaded file exceeds the maximum allowed size.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(415).json({
        success: false,
        error: 'Unsupported file type',
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: err.message,
      });
    }
  }
  next(err);
}

module.exports = { resumeUpload, logoUpload, verificationDocUpload, handleMulterError };
