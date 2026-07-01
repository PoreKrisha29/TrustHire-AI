const { db } = require('./src/config/database');
const { users, employerProfiles, jobListings, companyVerifications } = require('./src/db/schema');
const { ne } = require('drizzle-orm');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Cleaning up existing demo data...');
    // Delete dependencies first
    await db.delete(companyVerifications);
    await db.delete(jobListings);
    await db.delete(employerProfiles);
    // Delete users except our main user krishapore2006@gmail.com
    await db.delete(users).where(ne(users.email, 'krishapore2006@gmail.com'));

    console.log('Seeding demo data...');

    // Hash password for employers
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Stripe Employer User
    console.log('Creating Stripe employer...');
    const [stripeUser] = await db.insert(users).values({
      email: 'hiring@stripe.com',
      passwordHash,
      role: 'EMPLOYER',
      emailVerified: true
    }).returning();

    const [stripeProfile] = await db.insert(employerProfiles).values({
      userId: stripeUser.id,
      companyName: 'Stripe Inc.',
      website: 'https://stripe.com',
      industry: 'Fintech',
      companySize: '500+',
      location: 'San Francisco, CA',
      description: 'Stripe is a financial infrastructure platform for the internet. Millions of companies—from the world’s largest enterprises to the most ambitious startups—use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.',
      verified: true
    }).returning();

    // 2. Google Employer User
    console.log('Creating Google employer...');
    const [googleUser] = await db.insert(users).values({
      email: 'careers@google.com',
      passwordHash,
      role: 'EMPLOYER',
      emailVerified: true
    }).returning();

    const [googleProfile] = await db.insert(employerProfiles).values({
      userId: googleUser.id,
      companyName: 'Google',
      website: 'https://google.com',
      industry: 'Technology',
      companySize: '500+',
      location: 'Mountain View, CA',
      description: 'Google is a global technology leader focused on improving the ways people connect with information. Our innovations in web search and advertising have made our website a top internet property and our brand one of the most recognized in the world.',
      verified: true
    }).returning();

    // 3. Fake / Scam Company
    console.log('Creating Fake Company employer...');
    const [fakeUser] = await db.insert(users).values({
      email: 'easyjobs@global-wealth-inc-secure.biz',
      passwordHash,
      role: 'EMPLOYER',
      emailVerified: true
    }).returning();

    const [fakeProfile] = await db.insert(employerProfiles).values({
      userId: fakeUser.id,
      companyName: 'Global Wealth Processors',
      website: 'http://global-wealth-inc-secure.biz',
      industry: 'Business Services',
      companySize: '1-10',
      location: 'Remote / Unknown',
      description: 'We help users unlock simple financial processes to make quick cash at home. Safe and secure deposits daily.',
      verified: false
    }).returning();

    // Seed Job Listings
    console.log('Creating Job Listings...');
    // Real Job 1: Stripe Backend Software Engineer (Active, High trust score)
    await db.insert(jobListings).values({
      employerId: stripeProfile.id,
      title: 'Senior Backend Software Engineer (Node.js)',
      description: 'We are looking for a Senior Backend Engineer to join our Payment Processing core team. You will design, build, and maintain APIs that process billions of dollars of transactions. Ideal candidates have strong experience in Node.js/Express, PostgreSQL databases, Redis caching, and building highly resilient distributed systems.',
      requirements: 'Qualifications:\n- 5+ years of software engineering experience in JavaScript/TypeScript.\n- Experience working with high-volume SQL databases (PostgreSQL, MySQL).\n- Strong understanding of REST APIs, serverless infrastructure, and security best practices.',
      location: 'San Francisco, CA',
      jobType: 'FULL_TIME',
      salaryMin: 140000,
      salaryMax: 190000,
      status: 'ACTIVE',
      trustScore: 96,
      trustFlags: []
    });

    // Real Job 2: Stripe Frontend Engineer (Active, High trust score)
    await db.insert(jobListings).values({
      employerId: stripeProfile.id,
      title: 'Frontend Software Engineer (React / Next.js)',
      description: 'Join the Stripe Billing UI team to build customer portals and invoices dashboard. You will work closely with designers and product managers to create high-performance interactive user interfaces in React, TailwindCSS, and Next.js. You will optimize loading speeds and ensure high accessibility (a11y) standards.',
      requirements: 'Qualifications:\n- 3+ years of web design experience using modern React/React 18.\n- Expert in TailwindCSS, responsive web layouts, and state management (Zustand, Redux).\n- Detail-oriented for micro-interactions and transitions.',
      location: 'Remote',
      jobType: 'REMOTE',
      salaryMin: 110000,
      salaryMax: 150000,
      status: 'ACTIVE',
      trustScore: 92,
      trustFlags: []
    });

    // Real Job 3: Google Machine Learning Engineer (Active, High trust score)
    await db.insert(jobListings).values({
      employerId: googleProfile.id,
      title: 'Machine Learning Research Engineer (NLP & LLMs)',
      description: 'Google Research is hiring research engineers to push the boundaries of Large Language Models. You will work on pre-training and fine-tuning Gemini models, developing efficient architectures, and designing advanced retrieval-augmented generation (RAG) applications.',
      requirements: 'Qualifications:\n- Masters/PhD in Computer Science, AI, or equivalent.\n- Expert in Python, PyTorch, TensorFlow, and Hugging Face models.\n- Experience doing exploratory data analysis (EDA) with Pandas, NumPy, and visualization tools.',
      location: 'Mountain View, CA',
      jobType: 'FULL_TIME',
      salaryMin: 170000,
      salaryMax: 250000,
      status: 'ACTIVE',
      trustScore: 98,
      trustFlags: []
    });

    // Fake Job 4: Data Entry scam (Active but flagged, low trust score)
    await db.insert(jobListings).values({
      employerId: fakeProfile.id,
      title: 'Remote Data Entry Clerk - Easy Cash From Home',
      description: 'POST ADS AND SCAN RECIEPTS ONLINE! Get paid instantly up to $500 per day! Work only 2-3 hours from home! No experience required. We process wire transfers immediately. Open positions for freshers and students. Hurry up, apply today!',
      requirements: 'Must have laptop and fast internet connection. Must be willing to transfer processed funds through local account. Training provided.',
      location: 'Remote',
      jobType: 'PART_TIME',
      salaryMin: 100000,
      salaryMax: 150000, // unrealistically high salary for data entry
      status: 'ACTIVE',
      trustScore: 35,
      trustFlags: [
        'Unrealistically high salary for a data entry role.',
        'Uses urgent/informal phishing language (e.g. "Get paid instantly", "Easy Cash").',
        'Employer company website has a suspicious top-level domain (.biz).'
      ]
    });

    // Seed Company Verifications
    console.log('Seeding company verifications...');
    await db.insert(companyVerifications).values({
      employerId: stripeProfile.id,
      status: 'VERIFIED',
      registrationNumber: 'STR-993882-SF',
      documentUrl: 'https://trusthire-files.s3.amazonaws.com/stripe_corp.pdf',
      websiteUrl: 'https://stripe.com',
      linkedinUrl: 'https://linkedin.com/company/stripe',
      adminNotes: 'Verified via Delaware business register and domain ownership verified.'
    });

    await db.insert(companyVerifications).values({
      employerId: googleProfile.id,
      status: 'VERIFIED',
      registrationNumber: 'GOOG-881736-CA',
      documentUrl: 'https://trusthire-files.s3.amazonaws.com/google_inc.pdf',
      websiteUrl: 'https://google.com',
      linkedinUrl: 'https://linkedin.com/company/google',
      adminNotes: 'Verified SEC documentation and domain registry record.'
    });

    await db.insert(companyVerifications).values({
      employerId: fakeProfile.id,
      status: 'PENDING',
      registrationNumber: 'FAKE-992-NONE',
      documentUrl: 'https://trusthire-files.s3.amazonaws.com/fake_doc.pdf',
      websiteUrl: 'http://global-wealth-inc-secure.biz',
      linkedinUrl: 'https://linkedin.com/company/global-wealth',
      adminNotes: 'Pending registry search, flagged for suspicious domain name registration.'
    });

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

seed();
