const { PrismaClient } = require('@prisma/client');

async function testConnection(url) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const rawDatabases = await prisma.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
    console.log(`\n=== Connected to ${url} ===`);
    console.log('Available databases:', rawDatabases.map(d => d.datname));

    const rawTables = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);
    console.log('Tables in current DB:');
    for (const t of rawTables) {
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${t.table_schema}"."${t.table_name}"`);
        console.log(`  -> ${t.table_schema}.${t.table_name}: ${countRes[0].count} rows`);
      } catch (e) {
        console.log(`  -> ${t.table_schema}.${t.table_name}: error (${e.message})`);
      }
    }
  } catch (err) {
    console.log(`Failed for ${url}: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const passwords = ['Naruto@69', '141976', 'postgres', 'admin'];
  const ports = [5432, 5433, 5434];
  const dbs = ['passary', 'postgres'];

  for (const port of ports) {
    for (const pw of passwords) {
      for (const db of dbs) {
        const url = `postgresql://postgres:${encodeURIComponent(pw)}@localhost:${port}/${db}`;
        await testConnection(url);
      }
    }
  }
}

run();
