/**
 * TrustHire AI — Drizzle ORM Schema
 * Single source of truth for all database tables.
 * Replaces: prisma/schema.prisma + MongoDB mongoose schemas
 *
 * Database: Neon Serverless PostgreSQL
 * ORM:      Drizzle ORM (drizzle-orm)
 */

const {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  unique,
  index,
  primaryKey,
} = require('drizzle-orm/pg-core');

// ── ENUMS ──────────────────────────────────────────────────────────

const userRoleEnum = pgEnum('user_role', ['CANDIDATE', 'EMPLOYER', 'ADMIN']);

const profileVisibilityEnum = pgEnum('profile_visibility', ['PUBLIC', 'PRIVATE']);

const companySizeEnum = pgEnum('company_size', [
  '1-10', '11-50', '51-200', '201-500', '500+',
]);

const jobTypeEnum = pgEnum('job_type', [
  'FULL_TIME', 'PART_TIME', 'REMOTE', 'CONTRACT',
]);

const jobStatusEnum = pgEnum('job_status', [
  'PROCESSING', 'DRAFT', 'ACTIVE', 'CLOSED', 'QUARANTINED', 'REMOVED',
]);

const applicationStatusEnum = pgEnum('application_status', [
  'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED', 'HIRED', 'WITHDRAWN',
]);

const verificationStatusEnum = pgEnum('verification_status', [
  'PENDING', 'VERIFIED', 'REJECTED',
]);

const emailLogStatusEnum = pgEnum('email_log_status', ['SENT', 'FAILED', 'BOUNCED']);

// ── TABLES ─────────────────────────────────────────────────────────

/**
 * Central identity table — all users (candidates, employers, admins)
 */
const users = pgTable('users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  email:         varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:  varchar('password_hash', { length: 255 }),
  role:          userRoleEnum('role').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  googleId:      varchar('google_id', { length: 255 }).unique(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('users_role_idx').on(t.role),
]));

/**
 * Extended profile for CANDIDATE users
 */
const candidateProfiles = pgTable('candidate_profiles', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName:         varchar('full_name', { length: 255 }).notNull(),
  location:         varchar('location', { length: 255 }),
  jobTitle:         varchar('job_title', { length: 255 }),
  skills:           jsonb('skills').default([]).notNull(),
  yearsExperience:  integer('years_experience'),
  preferredJobTypes: jsonb('preferred_job_types').default([]).notNull(),
  visibility:       profileVisibilityEnum('visibility').default('PUBLIC').notNull(),
  resumeUrl:        varchar('resume_url', { length: 500 }),
  completenessScore: integer('completeness_score').default(0).notNull(),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('candidate_profiles_visibility_idx').on(t.visibility),
  index('candidate_profiles_location_idx').on(t.location),
]));

/**
 * Extended profile for EMPLOYER users
 */
const employerProfiles = pgTable('employer_profiles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  website:     varchar('website', { length: 500 }),
  industry:    varchar('industry', { length: 100 }),
  companySize: companySizeEnum('company_size'),
  location:    varchar('location', { length: 255 }),
  description: text('description'),
  logoUrl:     varchar('logo_url', { length: 500 }),
  verified:    boolean('verified').default(false).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('employer_profiles_verified_idx').on(t.verified),
]));

/**
 * Job listings — Trust Score computed by AI service
 */
const jobListings = pgTable('job_listings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  employerId:   uuid('employer_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  title:        varchar('title', { length: 255 }).notNull(),
  description:  text('description').notNull(),
  requirements: text('requirements'),
  location:     varchar('location', { length: 255 }),
  jobType:      jobTypeEnum('job_type').notNull(),
  salaryMin:    integer('salary_min'),
  salaryMax:    integer('salary_max'),
  status:       jobStatusEnum('status').default('PROCESSING').notNull(),
  trustScore:   integer('trust_score'),
  trustFlags:   jsonb('trust_flags').default([]).notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('job_listings_status_idx').on(t.status),
  index('job_listings_trust_score_idx').on(t.trustScore),
  index('job_listings_employer_id_idx').on(t.employerId),
  index('job_listings_created_at_idx').on(t.createdAt),
]));

/**
 * Candidate job applications
 */
const applications = pgTable('applications', {
  id:          uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId:       uuid('job_id').notNull().references(() => jobListings.id, { onDelete: 'cascade' }),
  status:      applicationStatusEnum('status').default('APPLIED').notNull(),
  matchScore:  real('match_score'),
  appliedAt:   timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  unique('applications_candidate_job_unique').on(t.candidateId, t.jobId),
  index('applications_candidate_id_idx').on(t.candidateId, t.appliedAt),
  index('applications_job_id_idx').on(t.jobId, t.matchScore),
  index('applications_status_idx').on(t.status),
]));

/**
 * Company verification requests
 */
const companyVerifications = pgTable('company_verifications', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  employerId:         uuid('employer_id').unique().notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  status:             verificationStatusEnum('status').default('PENDING').notNull(),
  registrationNumber: varchar('registration_number', { length: 100 }),
  documentUrl:        varchar('document_url', { length: 500 }).notNull(),
  websiteUrl:         varchar('website_url', { length: 500 }),
  linkedinUrl:        varchar('linkedin_url', { length: 500 }),
  verificationChecks: jsonb('verification_checks').default({}).notNull(),
  adminNotes:         text('admin_notes'),
  adminId:            uuid('admin_id').references(() => users.id),
  verifiedAt:         timestamp('verified_at', { withTimezone: true }),
  createdAt:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('company_verifications_status_idx').on(t.status),
  index('company_verifications_created_at_idx').on(t.createdAt),
]));

/**
 * SBERT embedding vectors for candidate profiles (384-dim)
 * NOTE: The actual vector column is created via raw SQL migration.
 * This table stores the candidate_id + metadata; the vector column is added separately.
 */
const candidateEmbeddings = pgTable('candidate_embeddings', {
  candidateId: uuid('candidate_id').primaryKey().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * SBERT embedding vectors for job listings (384-dim)
 */
const jobEmbeddings = pgTable('job_embeddings', {
  jobId:     uuid('job_id').primaryKey().references(() => jobListings.id, { onDelete: 'cascade' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Admin audit trail — immutable log of all admin actions
 */
const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  adminId:    uuid('admin_id').notNull().references(() => users.id),
  action:     varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId:   uuid('target_id'),
  metadata:   jsonb('metadata').default({}).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('audit_log_admin_id_idx').on(t.adminId),
  index('audit_log_created_at_idx').on(t.createdAt),
  index('audit_log_target_idx').on(t.targetType, t.targetId),
]));

/**
 * User notification preferences
 */
const notificationPreferences = pgTable('notification_preferences', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  appStatusEmail: boolean('app_status_email').default(true).notNull(),
  marketingEmail: boolean('marketing_email').default(false).notNull(),
});

/**
 * Email delivery audit log
 */
const emailLog = pgTable('email_log', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').references(() => users.id),
  type:             varchar('type', { length: 50 }).notNull(),
  status:           emailLogStatusEnum('status').default('SENT').notNull(),
  sendgridMessageId: varchar('sendgrid_message_id', { length: 255 }),
  sentAt:           timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('email_log_user_id_idx').on(t.userId),
  index('email_log_sent_at_idx').on(t.sentAt),
]));

// ── DOCUMENT TABLES (replaces MongoDB) ────────────────────────────

/**
 * Resume analysis results — replaces MongoDB resume_analyses collection.
 * Full analysis JSON stored in JSONB column.
 */
const resumeAnalyses = pgTable('resume_analyses', {
  id:           uuid('id').primaryKey().defaultRandom(),
  candidateId:  uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  fileUrl:      varchar('file_url', { length: 500 }).notNull(),
  overallScore: integer('overall_score').notNull(),
  atsScore:     integer('ats_score').notNull(),
  data:         jsonb('data').notNull(), // Full analysis: { strengths, weaknesses, suggestions, missing_keywords, integrity_flags, breakdown }
  targetRole:   varchar('target_role', { length: 255 }),
  analyzedAt:   timestamp('analyzed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('resume_analyses_candidate_id_idx').on(t.candidateId, t.analyzedAt),
]));

/**
 * AI chat sessions — replaces MongoDB chat_sessions collection.
 * Messages stored as JSONB array.
 */
const chatSessions = pgTable('chat_sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).unique().notNull(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messages:  jsonb('messages').default([]).notNull(), // [{ role, content, timestamp }]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ([
  index('chat_sessions_user_id_idx').on(t.userId, t.createdAt),
]));

module.exports = {
  // Enums
  userRoleEnum,
  profileVisibilityEnum,
  companySizeEnum,
  jobTypeEnum,
  jobStatusEnum,
  applicationStatusEnum,
  verificationStatusEnum,
  emailLogStatusEnum,
  // Tables
  users,
  candidateProfiles,
  employerProfiles,
  jobListings,
  applications,
  companyVerifications,
  candidateEmbeddings,
  jobEmbeddings,
  auditLog,
  notificationPreferences,
  emailLog,
  resumeAnalyses,
  chatSessions,
};
