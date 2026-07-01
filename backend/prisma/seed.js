/**
 * TrustHire AI — Backend Seed Script
 * Run with: npm run db:seed
 *
 * Creates realistic demo data for local dev and demos:
 *   - 1 Admin
 *   - 3 Employers (1 verified, 2 unverified)
 *   - 5 Candidates (complete profiles)
 *   - 9 Job Listings (high / medium / quarantined trust scores)
 *   - 5 Applications (linked candidates to jobs)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main() {
  console.log('\n🌱 Starting TrustHire AI database seed...\n');

  // ── Clean slate (order matters for FK constraints) ─────────────
  console.log('🗑️  Clearing existing data...');
  await prisma.applications.deleteMany();
  await prisma.jobEmbedding.deleteMany();
  await prisma.candidateEmbedding.deleteMany();
  await prisma.jobListing.deleteMany();
  await prisma.companyVerification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.employerProfile.deleteMany();
  await prisma.user.deleteMany();

  // ── Admin ──────────────────────────────────────────────────────
  console.log('👑 Creating admin...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@trusthireai.com',
      passwordHash: await hashPassword('Admin@TrustHire2026!'),
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: adminUser.id } });

  // ── Employer 1: TechVision Solutions (Verified) ────────────────
  console.log('🏢 Creating employers...');
  const emp1User = await prisma.user.create({
    data: { email: 'hr@techvision.com', passwordHash: await hashPassword('Employer@123!'), role: 'EMPLOYER', emailVerified: true },
  });
  const emp1Profile = await prisma.employerProfile.create({
    data: {
      userId: emp1User.id,
      companyName: 'TechVision Solutions',
      website: 'https://techvision.com',
      industry: 'Software Development',
      companySize: 'SIZE_51_200',
      location: 'Bangalore, India',
      description: 'TechVision Solutions is a product company building enterprise SaaS tools for HR teams across India.',
      verified: true,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: emp1User.id } });
  await prisma.companyVerification.create({
    data: {
      employerId: emp1Profile.id,
      status: 'VERIFIED',
      registrationNumber: 'CIN-U72200KA2018PTC111234',
      documentUrl: 'verifications/emp1/certificate.pdf',
      websiteUrl: 'https://techvision.com',
      linkedinUrl: 'https://linkedin.com/company/techvision-solutions',
      verificationChecks: {
        dns_lookup: { passed: true },
        http_ping: { passed: true, status_code: 200 },
        linkedin_format: { passed: true },
      },
      adminId: adminUser.id,
      verifiedAt: new Date(),
    },
  });

  // ── Employer 2: DataFirst Analytics (Unverified) ───────────────
  const emp2User = await prisma.user.create({
    data: { email: 'jobs@datafirst.io', passwordHash: await hashPassword('Employer@123!'), role: 'EMPLOYER', emailVerified: true },
  });
  const emp2Profile = await prisma.employerProfile.create({
    data: {
      userId: emp2User.id,
      companyName: 'DataFirst Analytics',
      website: 'https://datafirst.io',
      industry: 'Data Analytics',
      companySize: 'SIZE_11_50',
      location: 'Mumbai, India',
      description: 'DataFirst helps businesses make data-driven decisions with real-time analytics dashboards.',
      verified: false,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: emp2User.id } });

  // ── Employer 3: Quick Jobs Network (Suspicious — quarantine demo) ──
  const emp3User = await prisma.user.create({
    data: { email: 'apply@quick-jobs.net', passwordHash: await hashPassword('Employer@123!'), role: 'EMPLOYER', emailVerified: true },
  });
  const emp3Profile = await prisma.employerProfile.create({
    data: {
      userId: emp3User.id,
      companyName: 'Quick Jobs Network',
      website: 'https://quick-jobs.net',
      industry: 'Recruitment',
      companySize: 'SIZE_1_10',
      location: 'Delhi, India',
      verified: false,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: emp3User.id } });

  // ── Candidates ─────────────────────────────────────────────────
  console.log('👤 Creating candidates...');
  const candidateData = [
    {
      email: 'krishna@example.com', name: 'Krishna Pore',
      title: 'Full Stack Developer', location: 'Pune, India',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'], exp: 3,
    },
    {
      email: 'ananya@example.com', name: 'Ananya Singh',
      title: 'Senior React Engineer', location: 'Bangalore, India',
      skills: ['React', 'TypeScript', 'Redux', 'GraphQL', 'AWS'], exp: 5,
    },
    {
      email: 'rahul@example.com', name: 'Rahul Sharma',
      title: 'Data Scientist', location: 'Hyderabad, India',
      skills: ['Python', 'TensorFlow', 'Pandas', 'scikit-learn', 'SQL'], exp: 4,
    },
    {
      email: 'priya@example.com', name: 'Priya Mehta',
      title: 'ML Engineer', location: 'Mumbai, India',
      skills: ['Python', 'PyTorch', 'NLP', 'BERT', 'FastAPI'], exp: 2,
    },
    {
      email: 'arjun@example.com', name: 'Arjun Nair',
      title: 'Backend Developer', location: 'Chennai, India',
      skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Celery'], exp: 3,
    },
  ];

  const candidates = [];
  for (const c of candidateData) {
    const user = await prisma.user.create({
      data: { email: c.email, passwordHash: await hashPassword('Candidate@123!'), role: 'CANDIDATE', emailVerified: true },
    });
    const profile = await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        fullName: c.name,
        location: c.location,
        jobTitle: c.title,
        skills: c.skills,
        yearsExperience: c.exp,
        preferredJobTypes: ['FULL_TIME', 'REMOTE'],
        visibility: 'PUBLIC',
        resumeUrl: `resumes/${user.id}/resume.pdf`,
        completenessScore: 100,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    candidates.push({ user, profile });
    console.log(`   ✓ ${c.name}`);
  }

  // ── Job Listings ───────────────────────────────────────────────
  console.log('\n📋 Creating job listings...');

  // TechVision — High Trust (verified, detailed descriptions)
  const job1 = await prisma.jobListing.create({
    data: {
      employerId: emp1Profile.id,
      title: 'Senior Full Stack Engineer',
      description: 'TechVision Solutions is looking for a Senior Full Stack Engineer to join our growing product team. You will design, build, and maintain scalable web applications used by thousands of HR professionals across India. You will work closely with designers and product managers to deliver high-quality features using React, TypeScript, Node.js, and PostgreSQL. Strong problem-solving skills and 4+ years of experience are required. We offer competitive compensation, health insurance, and a remote-first culture.',
      requirements: 'React 18, TypeScript, Node.js 20, PostgreSQL, Docker, REST APIs, Git, 4+ years experience, AWS/GCP experience preferred',
      location: 'Bangalore, India',
      jobType: 'REMOTE',
      salaryMin: 1800000,
      salaryMax: 2800000,
      status: 'ACTIVE',
      trustScore: 91,
      trustFlags: [],
    },
  });

  const job2 = await prisma.jobListing.create({
    data: {
      employerId: emp1Profile.id,
      title: 'Product Designer (UI/UX)',
      description: 'We are seeking a talented Product Designer to lead design for our HR platform suite. You will own the end-to-end design process — from user research and wireframing to high-fidelity prototypes and design system maintenance. Collaborate with engineering and product teams to ship beautiful, accessible experiences. Strong Figma skills and a portfolio of SaaS product design work are required.',
      requirements: 'Figma, User Research, Design Systems, Prototyping, 3+ years of product design experience, SaaS product experience preferred',
      location: 'Bangalore, India',
      jobType: 'FULL_TIME',
      salaryMin: 1500000,
      salaryMax: 2200000,
      status: 'ACTIVE',
      trustScore: 87,
      trustFlags: [],
    },
  });

  const job3 = await prisma.jobListing.create({
    data: {
      employerId: emp1Profile.id,
      title: 'Backend Engineer (Node.js)',
      description: 'TechVision is growing its backend team. We need a skilled Node.js engineer who can build and maintain RESTful APIs for our enterprise HR platform. You will work with PostgreSQL, Redis, and AWS S3. Experience with TypeScript, Express.js, and database optimization is required. We offer a remote-first environment with quarterly in-person meetups.',
      requirements: 'Node.js, TypeScript, Express.js, PostgreSQL, Redis, AWS S3, REST API design, 3+ years experience',
      location: 'Remote',
      jobType: 'REMOTE',
      salaryMin: 1600000,
      salaryMax: 2400000,
      status: 'ACTIVE',
      trustScore: 89,
      trustFlags: [],
    },
  });

  const job4 = await prisma.jobListing.create({
    data: {
      employerId: emp1Profile.id,
      title: 'DevOps Engineer',
      description: 'TechVision is looking for a DevOps Engineer to build and maintain our cloud infrastructure. You will manage CI/CD pipelines using GitHub Actions, deploy microservices on AWS (ECS, RDS, ElastiCache), and ensure 99.9% uptime for our SaaS platform. Experience with Docker, Kubernetes, Terraform, and AWS is required.',
      requirements: 'AWS, Docker, Kubernetes, Terraform, GitHub Actions, Prometheus, Grafana, 3+ years DevOps experience',
      location: 'Bangalore, India',
      jobType: 'FULL_TIME',
      salaryMin: 1600000,
      salaryMax: 2500000,
      status: 'ACTIVE',
      trustScore: 84,
      trustFlags: [],
    },
  });

  // DataFirst — Medium Trust (unverified)
  const job5 = await prisma.jobListing.create({
    data: {
      employerId: emp2Profile.id,
      title: 'Data Scientist',
      description: 'DataFirst Analytics is hiring a Data Scientist to build predictive models and dashboards for our business intelligence platform. You will work with large datasets using Python, scikit-learn, and TensorFlow to deliver actionable insights. Experience with statistical analysis, data visualization, and machine learning pipelines is required.',
      requirements: 'Python, pandas, scikit-learn, TensorFlow/PyTorch, SQL, Tableau or Power BI, 2+ years experience',
      location: 'Mumbai, India',
      jobType: 'FULL_TIME',
      salaryMin: 1200000,
      salaryMax: 1800000,
      status: 'ACTIVE',
      trustScore: 68,
      trustFlags: [{ signal: 'UNVERIFIED_COMPANY', penalty: 0, description: 'Company not yet verified by TrustHire AI' }],
    },
  });

  const job6 = await prisma.jobListing.create({
    data: {
      employerId: emp2Profile.id,
      title: 'ML Engineer (NLP)',
      description: 'We are looking for an ML Engineer specialising in Natural Language Processing. You will build and deploy NLP models for text classification, entity extraction, and sentiment analysis at scale. Experience with transformer models (BERT, GPT), HuggingFace, and production ML deployment is required.',
      requirements: 'Python, HuggingFace Transformers, BERT, FastAPI, Docker, MLflow, 2+ years NLP experience',
      location: 'Remote',
      jobType: 'REMOTE',
      salaryMin: 1400000,
      salaryMax: 2000000,
      status: 'ACTIVE',
      trustScore: 62,
      trustFlags: [{ signal: 'UNVERIFIED_COMPANY', penalty: 0, description: 'Company not yet verified by TrustHire AI' }],
    },
  });

  const job7 = await prisma.jobListing.create({
    data: {
      employerId: emp2Profile.id,
      title: 'Python Developer (Django)',
      description: 'DataFirst is looking for a Python developer with strong Django experience to build internal data processing services. You will develop APIs for our data ingestion pipeline, integrate with third-party analytics tools, and work on performance optimisation. Experience with Django REST Framework, Celery for async tasks, and PostgreSQL is required.',
      requirements: 'Python, Django, DRF, Celery, PostgreSQL, Redis, Docker, 2+ years experience',
      location: 'Mumbai, India',
      jobType: 'FULL_TIME',
      salaryMin: 1000000,
      salaryMax: 1500000,
      status: 'ACTIVE',
      trustScore: 71,
      trustFlags: [{ signal: 'UNVERIFIED_COMPANY', penalty: 0, description: 'Company not yet verified by TrustHire AI' }],
    },
  });

  // Quick Jobs — Low Trust (QUARANTINED — demo of fraud detection)
  await prisma.jobListing.create({
    data: {
      employerId: emp3Profile.id,
      title: 'Work from Home – Earn Big Easily',
      description: 'Earn big from home. No experience needed. Guaranteed income. Apply now!',
      requirements: 'None',
      location: 'Remote',
      jobType: 'REMOTE',
      salaryMin: 5000000,
      salaryMax: 10000000,
      status: 'QUARANTINED',
      trustScore: 15,
      trustFlags: [
        { signal: 'SHORT_DESCRIPTION', penalty: 20, description: 'Job description is under 100 words' },
        { signal: 'UNREALISTIC_SALARY', penalty: 20, description: 'Salary exceeds 3× industry median for this role category' },
        { signal: 'NO_WEB_PRESENCE', penalty: 25, description: 'Company domain has no detectable web presence' },
      ],
    },
  });

  await prisma.jobListing.create({
    data: {
      employerId: emp3Profile.id,
      title: 'Urgent Hiring – Data Entry Remote',
      description: 'We need data entry operators urgently. Fast approval. No interviews.',
      requirements: 'Basic computer skills',
      location: 'Remote',
      jobType: 'REMOTE',
      salaryMin: 800000,
      salaryMax: 1200000,
      status: 'QUARANTINED',
      trustScore: 28,
      trustFlags: [
        { signal: 'SHORT_DESCRIPTION', penalty: 20, description: 'Job description is under 100 words' },
        { signal: 'MASS_POSTING', penalty: 10, description: 'Employer posted more than 10 listings in 24 hours' },
        { signal: 'NO_WEB_PRESENCE', penalty: 25, description: 'Company domain has no detectable web presence' },
      ],
    },
  });

  // ── Applications ───────────────────────────────────────────────
  console.log('\n📨 Creating applications...');

  await prisma.applications.create({
    data: { candidateId: candidates[0].profile.id, jobId: job1.id, status: 'SHORTLISTED', matchScore: 84.5 },
  });
  await prisma.applications.create({
    data: { candidateId: candidates[1].profile.id, jobId: job1.id, status: 'APPLIED', matchScore: 79.2 },
  });
  await prisma.applications.create({
    data: { candidateId: candidates[2].profile.id, jobId: job5.id, status: 'INTERVIEW_SCHEDULED', matchScore: 91.3 },
  });
  await prisma.applications.create({
    data: { candidateId: candidates[3].profile.id, jobId: job6.id, status: 'APPLIED', matchScore: 87.6 },
  });
  await prisma.applications.create({
    data: { candidateId: candidates[4].profile.id, jobId: job7.id, status: 'APPLIED', matchScore: 76.0 },
  });

  // ── Summary ────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    jobs: await prisma.jobListing.count(),
    applications: await prisma.applications.count(),
  };

  console.log('\n✅ Seed complete!\n');
  console.log('─'.repeat(55));
  console.log('  CREDENTIALS (for testing)');
  console.log('─'.repeat(55));
  console.log('  Admin:       admin@trusthireai.com');
  console.log('               Admin@TrustHire2026!');
  console.log('  Employer 1:  hr@techvision.com  (✅ Verified)');
  console.log('               Employer@123!');
  console.log('  Employer 2:  jobs@datafirst.io  (⚠️  Unverified)');
  console.log('               Employer@123!');
  console.log('  Employer 3:  apply@quick-jobs.net  (🚫 Quarantined jobs)');
  console.log('               Employer@123!');
  console.log('  Candidate:   krishna@example.com');
  console.log('               Candidate@123!');
  console.log('─'.repeat(55));
  console.log(`  ${counts.users} users  |  ${counts.jobs} jobs  |  ${counts.applications} applications`);
  console.log('─'.repeat(55));
}

main()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
