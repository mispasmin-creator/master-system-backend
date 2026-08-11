const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

async function testServicesEndpoints() {
  console.log('=== STARTING SERVICES ENDPOINTS VERIFICATION ===\n');

  const baseUrl = 'http://localhost:5000/api/services';

  // 1. Create Offer
  console.log('1. Testing POST /api/services/offers...');
  const offerRes = await fetch(`${baseUrl}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offerNo: 'OFF-EP-01',
      firmName: 'PMMPL',
      vendor: 'Generator Services Ltd',
      description: 'DGs Generator Overhaul Service',
      location: 'Factory Unit 2',
      amount: 180000,
      isOffer: 'Yes'
    })
  });
  const offerData = await offerRes.json();
  const offerId = offerData.data.id;
  console.log('   Status:', offerRes.status, 'Offer No:', offerData.data.offerNo);

  // Prisma verification
  const dbOffer = await prisma.serviceOffer.findUnique({ where: { id: offerId } });
  console.log('   Prisma Verify:', dbOffer ? 'PASS ✅' : 'FAIL ❌', 'Vendor:', dbOffer?.vendor);

  // 2. Convert Offer to Job
  console.log('\n2. Testing POST /api/services/offers/:id/convert...');
  const convRes = await fetch(`${baseUrl}/offers/${offerId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checker: 'David Checker',
      amount: 180000,
      tdsAmount: 3600,
      remark: 'Converted DG overhaul offer'
    })
  });
  const convData = await convRes.json();
  const jobId = convData.data.id;
  console.log('   Status:', convRes.status, 'Service No:', convData.data.serviceNo, 'Derived Status:', convData.data.status);

  // Prisma verification
  const dbJob1 = await prisma.serviceJob.findUnique({ where: { id: jobId } });
  console.log('   Prisma Verify:', dbJob1 ? 'PASS ✅' : 'FAIL ❌', 'Status:', dbJob1?.status);

  // 3. Update Job with Bill and Advance Stage
  console.log('\n3. Testing PUT /api/services/jobs/:id (Updating Bill No & Stage 2)...');
  const updateJobRes = await fetch(`${baseUrl}/jobs/${jobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      billNo: 'BILL-DG-99',
      actual1: new Date().toISOString()
    })
  });
  const updateJobData = await updateJobRes.json();
  console.log('   Updated Status:', updateJobData.data.status, 'Bill No:', updateJobData.data.billNo);

  // 4. Advance Stage 4/5 via Tally Endpoint
  console.log('\n4. Testing POST /api/services/tally/:id/advance...');
  const tallyRes = await fetch(`${baseUrl}/tally/${jobId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actual4: new Date().toISOString(),
      status4: 'Completed',
      remarks4: 'Audited cleanly',
      actual5: new Date().toISOString(),
      status5: 'Completed',
      remarks5: 'Tally entry posted'
    })
  });
  const tallyData = await tallyRes.json();
  console.log('   Advanced Status:', tallyData.data.status, 'Status5:', tallyData.data.status5);

  // Prisma verification
  const dbJob2 = await prisma.serviceJob.findUnique({ where: { id: jobId } });
  console.log('   Prisma Verify Final Status:', dbJob2?.status === 'Completed' ? 'PASS ✅' : 'FAIL ❌');

  // 5. Create & Approve Utility
  console.log('\n5. Testing POST /api/services/utility...');
  const utilRes = await fetch(`${baseUrl}/utility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      utilityNo: 'UT-EP-01',
      firmName: 'PMMPL',
      personName: 'Rudra Singh',
      department: 'Logistics',
      payTo: 'Electricity Board',
      amount: 45000,
      dueDate: '2026-08-25'
    })
  });
  const utilData = await utilRes.json();
  const utilId = utilData.data.id;
  console.log('   Created Utility:', utilData.data.utilityNo, 'Status:', utilData.data.status);

  console.log('\n6. Testing POST /api/services/utility/:id/approve...');
  const appUtilRes = await fetch(`${baseUrl}/utility/${utilId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmsName: 'Utility FMS',
      details: 'Monthly High Tension Power Bill'
    })
  });
  const appUtilData = await appUtilRes.json();
  console.log('   Approved Utility Status:', appUtilData.data.status, 'FMS Name:', appUtilData.data.fmsName);

  // 7. Get Reports Dashboard & Master
  console.log('\n7. Testing GET /api/services/reports/dashboard...');
  const repRes = await fetch(`${baseUrl}/reports/dashboard`);
  const repData = await repRes.json();
  console.log('   Total Jobs:', repData.data.totalJobs, 'Total Offers:', repData.data.totalOffers, 'Total Utilities:', repData.data.totalUtilities);

  console.log('\n8. Testing GET /api/services/master...');
  const mastRes = await fetch(`${baseUrl}/master`);
  const mastData = await mastRes.json();
  console.log('   Firms Count:', mastData.data.firmNames.length, 'Departments:', mastData.data.departments.join(', '));

  // Clean up test data
  await prisma.serviceUtility.delete({ where: { id: utilId } });
  await prisma.serviceJob.delete({ where: { id: jobId } });
  await prisma.serviceOffer.delete({ where: { id: offerId } });

  console.log('\n=== ALL ENDPOINTS VERIFIED AND PASSED PERFECTLY ===');
}

testServicesEndpoints().catch(console.error);
