const { db } = require('./src/config/database');
const { candidateProfiles } = require('./src/db/schema');
const { eq } = require('drizzle-orm');

async function checkAndUpdateCandidate() {
  try {
    const rows = await db.select().from(candidateProfiles).limit(1);
    if (rows[0]) {
      console.log('Existing candidate profile:', rows[0]);
      // Let's update it to ensure it has skills and experience
      await db.update(candidateProfiles).set({
        fullName: 'Krisha Pore',
        location: 'San Francisco, CA',
        jobTitle: 'Software Engineer',
        skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Python', 'Machine Learning'],
        yearsExperience: 4,
        preferredJobTypes: ['FULL_TIME', 'REMOTE'],
        completenessScore: 90
      }).where(eq(candidateProfiles.id, rows[0].id));
      console.log('🎉 Updated candidate profile with demo skills!');
    } else {
      console.log('No candidate profile found.');
    }
  } catch (error) {
    console.error(error);
  }
}
checkAndUpdateCandidate();
