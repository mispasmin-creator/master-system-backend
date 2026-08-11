const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  const username = 'admin1';
  const rawPassword = 'admin123';

  const hash = await bcrypt.hash(rawPassword, 10);

  const existing = await prisma.login.findUnique({
    where: { username },
  });

  if (existing) {
    const updated = await prisma.login.update({
      where: { id: existing.id },
      data: {
        password: hash,
        role: 'admin',
        page_access: 'all',
        firm_name: 'all',
      },
    });
    console.log('Successfully updated existing admin1 user:', updated);
  } else {
    const created = await prisma.login.create({
      data: {
        username,
        password: hash,
        role: 'admin',
        page_access: 'all',
        firm_name: 'all',
      },
    });
    console.log('Successfully created new admin1 user:', created);
  }
}

createAdminUser()
  .catch((err) => {
    console.error('Error creating admin1 user:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
