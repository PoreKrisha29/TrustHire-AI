/** Standardised error codes used across all API responses */
const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS:  'AUTH_001',
  EMAIL_NOT_VERIFIED:   'AUTH_002',
  ACCOUNT_LOCKED:       'AUTH_003',
  TOKEN_EXPIRED:        'AUTH_004',
  TOKEN_INVALID:        'AUTH_005',
  FORBIDDEN:            'AUTH_006',
  UNAUTHORIZED:         'AUTH_007',
  EMAIL_ALREADY_EXISTS: 'AUTH_008',

  // Validation
  VALIDATION_ERROR:     'VAL_001',
  INVALID_FILE_TYPE:    'VAL_002',
  FILE_TOO_LARGE:       'VAL_003',

  // Resources
  NOT_FOUND:            'RES_001',
  DUPLICATE:            'RES_002',

  // Rate limiting
  RATE_LIMIT_EXCEEDED:  'RATE_001',
  LLM_DAILY_LIMIT:      'RATE_002',

  // Server
  INTERNAL_ERROR:       'SRV_001',
  SERVICE_UNAVAILABLE:  'SRV_002',
};

/** Application status allowed transitions */
const APP_STATUS_TRANSITIONS = {
  APPLIED:              ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED:          ['INTERVIEW_SCHEDULED', 'REJECTED'],
  INTERVIEW_SCHEDULED:  ['HIRED', 'REJECTED'],
  REJECTED:             [],
  HIRED:                [],
  WITHDRAWN:            [],
};

/** LLM daily query limit per user */
const LLM_DAILY_LIMIT = 20;

module.exports = { ErrorCodes, APP_STATUS_TRANSITIONS, LLM_DAILY_LIMIT };
