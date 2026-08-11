const connectDB = require('../config/db');
const prisma = connectDB.prisma;
const bcrypt = require('bcryptjs');

async function seedTestUsers() {
  console.log('====================================================');
  console.log('Seeding Test Users for Inventory Role-Based Access');
  console.log('====================================================');

  const defaultPassword = await bcrypt.hash('123', 10);

  const usersToSeed = [
    {
      username: 'inv_admin',
      password: defaultPassword,
      role: 'admin',
      firm_name: 'all',
      page_access: 'all',
    },
    {
      username: 'inv_manager_purab',
      password: defaultPassword,
      role: 'manager',
      firm_name: 'Purab',
      page_access: 'Inventory_Dashboard,Inventory_RawMaterial_Purab,Inventory_FinishGood_Purab,Inventory_StockAdjustment_Purab,Inventory_StockAdjustmentTab_Adjustments,Inventory_StockAdjustmentTab_OpStock',
    },
    {
      username: 'inv_viewer',
      password: defaultPassword,
      role: 'viewer',
      firm_name: 'Pmmpl',
      page_access: 'Inventory_Dashboard,Inventory_History',
    },
  ];

  for (const userData of usersToSeed) {
    const user = await prisma.login.upsert({
      where: { username: userData.username },
      update: {
        page_access: userData.page_access,
        role: userData.role,
        firm_name: userData.firm_name,
      },
      create: userData,
    });
    console.log(`Seeded user: ${user.username} | Role: ${user.role} | Page Access: ${user.page_access}`);
  }

  console.log('====================================================');
  console.log('✅ Test user seeding completed!');
  console.log('====================================================');
  process.exit(0);
}

seedTestUsers();
