const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

async function resetServicesEmpty() {
  console.log('=== TRUNCATING SERVICES TABLES FOR FRESH EMPTY STATE VERIFICATION ===\n');

  await prisma.serviceJob.deleteMany({});
  await prisma.serviceOffer.deleteMany({});
  await prisma.serviceUtility.deleteMany({});
  await prisma.serviceMasterDropdown.deleteMany({});

  const serviceJobCount = await prisma.serviceJob.count();
  const serviceOfferCount = await prisma.serviceOffer.count();
  const serviceUtilityCount = await prisma.serviceUtility.count();
  const serviceMasterDropdownCount = await prisma.serviceMasterDropdown.count();

  console.log('Postgres Row Counts After Reset:');
  console.log('  ServiceJob:', serviceJobCount, serviceJobCount === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  ServiceOffer:', serviceOfferCount, serviceOfferCount === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  ServiceUtility:', serviceUtilityCount, serviceUtilityCount === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  ServiceMasterDropdown:', serviceMasterDropdownCount, serviceMasterDropdownCount === 0 ? 'PASS ✅' : 'FAIL ❌');

  // Verify API responses reflect 0
  const baseUrl = 'http://localhost:5000/api/services';
  const [dashRes, offerRes, jobRes, utilRes] = await Promise.all([
    fetch(`${baseUrl}/reports/dashboard`).then(r => r.json()),
    fetch(`${baseUrl}/offers`).then(r => r.json()),
    fetch(`${baseUrl}/jobs`).then(r => r.json()),
    fetch(`${baseUrl}/utility`).then(r => r.json())
  ]);

  console.log('\nAPI Response Verification against Empty Postgres DB:');
  console.log('  Dashboard Total Jobs:', dashRes.data?.totalJobs, dashRes.data?.totalJobs === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  Dashboard Total Offers:', dashRes.data?.totalOffers, dashRes.data?.totalOffers === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  Dashboard Total Utilities:', dashRes.data?.totalUtilities, dashRes.data?.totalUtilities === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  Offers List Count:', offerRes.count, offerRes.count === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  Jobs List Count:', jobRes.count, jobRes.count === 0 ? 'PASS ✅' : 'FAIL ❌');
  console.log('  Utility List Count:', utilRes.count, utilRes.count === 0 ? 'PASS ✅' : 'FAIL ❌');
}

resetServicesEmpty()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
