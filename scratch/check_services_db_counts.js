const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

async function checkCounts() {
  const serviceJobCount = await prisma.serviceJob.count();
  const serviceOfferCount = await prisma.serviceOffer.count();
  const serviceUtilityCount = await prisma.serviceUtility.count();
  const serviceMasterDropdownCount = await prisma.serviceMasterDropdown.count();
  const loginCount = await prisma.login.count();

  console.log('=== PRISMA ROW COUNTS ===');
  console.log('ServiceJob count:', serviceJobCount);
  console.log('ServiceOffer count:', serviceOfferCount);
  console.log('ServiceUtility count:', serviceUtilityCount);
  console.log('ServiceMasterDropdown count:', serviceMasterDropdownCount);
  console.log('Login count:', loginCount);
}

checkCounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
