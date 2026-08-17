const { PrismaClient } = require('@prisma/client');

async function test() {
  const p = new PrismaClient({
    datasources: {
      db: { url: 'postgresql://postgres:141976@localhost:5433/postgres' }
    }
  });

  try {
    const rows = await p.refrasynthMaster.findMany();
    console.log('SUCCESS! Total rows in refrasynthMaster on 5433:', rows.length);
    console.log('Sample row:', rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await p.$disconnect();
  }
}

test();
