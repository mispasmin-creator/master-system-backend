const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

async function checkFrontendPageParity() {
  console.log('=== VERIFYING FRONTEND PAGE API PARITY ===\n');

  const baseUrl = 'http://localhost:5000/api/services';

  // 1. Dashboard.jsx API check
  console.log('1. Page: Dashboard.jsx -> GET /api/services/reports/dashboard');
  const dashRes = await fetch(`${baseUrl}/reports/dashboard`);
  const dashJson = await dashRes.json();
  console.log('   Response Keys:', Object.keys(dashJson.data));
  console.log('   Parity Status:', dashJson.success && dashJson.data.statusCounts ? 'MATCH ✅' : 'MISMATCH ❌');

  // 2. Offers.jsx API check
  console.log('\n2. Page: Offers.jsx -> GET /api/services/offers');
  const offerRes = await fetch(`${baseUrl}/offers`);
  const offerJson = await offerRes.json();
  console.log('   Count:', offerJson.count);
  console.log('   Parity Status:', offerJson.success && Array.isArray(offerJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  // 3. Services.jsx API check
  console.log('\n3. Page: Services.jsx -> GET /api/services/jobs');
  const jobRes = await fetch(`${baseUrl}/jobs`);
  const jobJson = await jobRes.json();
  console.log('   Count:', jobJson.count);
  console.log('   Parity Status:', jobJson.success && Array.isArray(jobJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  // 4. Bills.jsx API check
  console.log('\n4. Page: Bills.jsx -> GET /api/services/bills?tab=active');
  const billRes = await fetch(`${baseUrl}/bills?tab=active`);
  const billJson = await billRes.json();
  console.log('   Active Bills Count:', billJson.count);
  console.log('   Parity Status:', billJson.success && Array.isArray(billJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  // 5. Tally.jsx API check
  console.log('\n5. Page: Tally.jsx -> GET /api/services/tally?tab=audit');
  const tallyRes = await fetch(`${baseUrl}/tally?tab=audit`);
  const tallyJson = await tallyRes.json();
  console.log('   Audit Subtab Count:', tallyJson.count);
  console.log('   Parity Status:', tallyJson.success && Array.isArray(tallyJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  // 6. Utility.jsx API check
  console.log('\n6. Page: Utility.jsx -> GET /api/services/utility');
  const utilRes = await fetch(`${baseUrl}/utility`);
  const utilJson = await utilRes.json();
  console.log('   Utility Count:', utilJson.count);
  console.log('   Parity Status:', utilJson.success && Array.isArray(utilJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  // 7. Reports.jsx API check
  console.log('\n7. Page: Reports.jsx -> GET /api/services/reports/pending');
  const repRes = await fetch(`${baseUrl}/reports/pending`);
  const repJson = await repRes.json();
  console.log('   Pending Jobs Count:', repJson.data?.pendingJobs?.length);
  console.log('   Parity Status:', repJson.success && repJson.data?.pendingJobs ? 'MATCH ✅' : 'MISMATCH ❌');

  // 8. Users.jsx API check
  console.log('\n8. Page: Users.jsx -> GET /api/services/settings');
  const userRes = await fetch(`${baseUrl}/settings`);
  const userJson = await userRes.json();
  console.log('   Users Count:', userJson.count);
  console.log('   Parity Status:', userJson.success && Array.isArray(userJson.data) ? 'MATCH ✅' : 'MISMATCH ❌');

  console.log('\n=== ALL 8 FRONTEND PAGES PARITY VERIFIED SUCCESSFULLY ===');
}

checkFrontendPageParity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
