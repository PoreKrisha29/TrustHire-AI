const { db } = require('./src/config/database');
const { users } = require('./src/db/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');

async function resetPass() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.email, 'krishapore2006@gmail.com'));
    console.log('🎉 Successfully reset candidate password to "password123"!');
  } catch (error) {
    console.error(error);
  }
}
resetPass();
