const { PrismaClient } = require('@prisma/client');

const commonCredentials = [
  { user: 'postgres', pass: 'postgres' },
  { user: 'postgres', pass: 'admin' },
  { user: 'postgres', pass: 'root' },
  { user: 'postgres', pass: 'password' },
  { user: 'postgres', pass: '' },
  { user: 'postgres', pass: '1234' },
  { user: 'postgres', pass: '123456' },
  { user: 'postgres', pass: 'trusthire_dev_password' },
  { user: 'trusthire', pass: 'trusthire_dev_password' },
  { user: 'postgres', pass: 'postgrespw' }
];

async function testConnections() {
  for (const cred of commonCredentials) {
    const url = `postgresql://${cred.user}:${encodeURIComponent(cred.pass)}@localhost:5432/postgres`;
    console.log(`Testing URL: postgresql://${cred.user}:****@localhost:5432/postgres`);
    
    process.env.DATABASE_URL = url;
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: url
        }
      }
    });
    
    try {
      await prisma.$connect();
      console.log(`\n🎉 SUCCESS! Connected with: user=${cred.user}, pass=${cred.pass}`);
      await prisma.$disconnect();
      return;
    } catch (err) {
      console.log(`❌ Failed: ${err.message.split('\n')[0]}`);
    } finally {
      try {
        await prisma.$disconnect();
      } catch (e) {}
    }
  }
  console.log('\n❌ All common credentials failed.');
}

testConnections();
