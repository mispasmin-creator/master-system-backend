const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const bcrypt = require('bcryptjs');

const PAYMENT_TEST_USERS = [
  {
    username: 'payment_admin',
    password: 'admin123',
    name: 'System Payment Admin',
    role: 'admin',
    firms: 'Pmmpl, RKL, Purab, Refrasynth',
    pages: 'Payment_Dashboard, Payment_Payment Creation, Payment_Channel Funding, Payment_Payment Approval, Payment_Posting, Payment_Make Payment, Payment_User Management'
  },
  {
    username: 'payment_maker',
    password: 'maker123',
    name: 'John Payment Maker',
    role: 'maker',
    firms: 'Pmmpl, RKL',
    pages: 'Payment_Dashboard, Payment_Payment Creation'
  },
  {
    username: 'payment_checker',
    password: 'checker123',
    name: 'Sarah Payment Checker',
    role: 'checker',
    firms: 'Pmmpl, RKL, Purab',
    pages: 'Payment_Dashboard, Payment_Payment Creation, Payment_Payment Approval'
  },
  {
    username: 'payment_approver',
    password: 'approver123',
    name: 'Michael Payment Approver',
    role: 'approver',
    firms: 'Pmmpl, RKL, Purab, Refrasynth',
    pages: 'Payment_Dashboard, Payment_Payment Approval'
  },
  {
    username: 'payment_finance',
    password: 'finance123',
    name: 'David Payment Finance',
    role: 'finance',
    firms: 'Pmmpl, RKL, Purab, Refrasynth',
    pages: 'Payment_Dashboard, Payment_Channel Funding, Payment_Posting, Payment_Make Payment'
  },
  {
    username: 'payment_viewer',
    password: 'viewer123',
    name: 'Alice Payment Viewer',
    role: 'viewer',
    firms: 'Pmmpl',
    pages: 'Payment_Dashboard'
  }
];

async function seedUsers() {
  console.log('=== SEEDING PAYMENT MODULE RBAC TEST USERS ===\n');

  const results = [];

  for (const userSpec of PAYMENT_TEST_USERS) {
    const hashedPassword = await bcrypt.hash(userSpec.password, 10);

    const upserted = await prisma.login.upsert({
      where: { username: userSpec.username },
      update: {
        name: userSpec.name,
        role: userSpec.role,
        firm_name: userSpec.firms,
        page_access: userSpec.pages,
        password: hashedPassword
      },
      create: {
        username: userSpec.username,
        password: hashedPassword,
        name: userSpec.name,
        role: userSpec.role,
        firm_name: userSpec.firms,
        page_access: userSpec.pages
      }
    });

    // Verification step via direct Prisma read
    const verifyUser = await prisma.login.findUnique({
      where: { username: userSpec.username }
    });

    const firmMatch = verifyUser.firm_name === userSpec.firms;
    const pageMatch = verifyUser.page_access === userSpec.pages;
    const pass = firmMatch && pageMatch;

    results.push({
      username: verifyUser.username,
      role: verifyUser.role,
      firm_name: verifyUser.firm_name,
      page_access: verifyUser.page_access,
      status: pass ? 'PASS ✅' : 'FAIL ❌'
    });

    console.log(`User @${verifyUser.username} (${verifyUser.role}): ${pass ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`  Firms: ${verifyUser.firm_name}`);
    console.log(`  Pages: ${verifyUser.page_access}\n`);
  }

  console.log('=== SEED & RBAC VERIFICATION COMPLETED ===');
  return results;
}

seedUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
