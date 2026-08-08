// Idempotent seed — ensures a default admin exists in the `login` table so a
// freshly-created database (e.g. after `docker compose down -v`) is loginable.
// Credentials can be overridden via env: ADMIN_USERNAME / ADMIN_PASSWORD.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await prisma.login.findUnique({ where: { username } });
  if (existing) {
    console.log(`[seed] Admin "${username}" already exists — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
  await prisma.login.create({
    data: {
      username,
      password: hashed,
      role: 'admin',        // AuthContext: role==="admin" => super admin, full access
      page_access: 'all',   // access to every page
      firm_name: 'all',     // access to every firm
    },
  });
  console.log(`[seed] Created admin "${username}".`);
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
