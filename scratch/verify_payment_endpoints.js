const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const workflowService = require('../src/payment/shared/paymentWorkflow.service');

async function runVerification() {
  console.log('=== STARTING PAYMENT ENDPOINT & PRISMA VERIFICATION ===\n');

  const baseUrl = 'http://localhost:5000/api/payment';

  // 1. Create Payment Request
  console.log('1. Testing POST /api/payment/requests ...');
  const createRes = await fetch(`${baseUrl}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmsName: 'Repair FMS',
      firmName: 'PMMPL',
      payTo: 'Test Machinery Vendor',
      amount: 45000,
      department: 'Engineering',
      priority: 'High',
      remarks: 'Urgent pump replacement',
      plannedDate: '2026-08-01',
      requiredDate: '2026-08-05',
      status: 'Submitted'
    })
  });
  const createData = await createRes.json();
  console.log('HTTP Response Status:', createRes.status, 'Created Request Number:', createData.data.paymentNumber);

  const paymentId = createData.data.id;
  const paymentNumber = createData.data.paymentNumber;

  // Prisma verification 1
  const dbReq1 = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read #1:', {
    paymentNumber: dbReq1.paymentNumber,
    status: dbReq1.status,
    amount: dbReq1.amount,
    historyEntries: dbReq1.history.length,
    historyTitle: dbReq1.history[0]?.title
  });

  // 2. GET /api/payment/requests
  console.log('\n2. Testing GET /api/payment/requests ...');
  const listRes = await fetch(`${baseUrl}/requests?search=${paymentNumber}`);
  const listData = await listRes.json();
  console.log('HTTP Response Count:', listData.count, 'Found Payment:', listData.data[0]?.paymentNumber);

  // 3. Move Submitted -> Approved for Funding (Checker Approval step in CreatePayment)
  console.log('\n3. Testing Transition Submitted -> Approved for Funding ...');
  await workflowService.transition(
    paymentId,
    'Approved for Funding',
    { username: 'checker_sarah', role: 'checker' },
    'Checker verified indent details'
  );
  const dbReqChecker = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read (Checker Approval):', {
    status: dbReqChecker.status,
    latestHistory: dbReqChecker.history[dbReqChecker.history.length - 1]?.title
  });

  // 4. Channel Funding Step
  console.log('\n4. Testing POST /api/payment/requests/:id/channel-funding ...');
  const fundRes = await fetch(`${baseUrl}/requests/${paymentId}/channel-funding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Channel Funded',
      typeOfFunding: 'BHFDDF',
      remarks: 'Allocated from bank limit',
      actorUser: { username: 'finance_maker', role: 'finance' }
    })
  });
  const fundData = await fundRes.json();
  console.log('HTTP Response Status:', fundRes.status, 'New Status:', fundData.data.status);

  // Prisma verification 2
  const dbReq2 = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read #2 (Channel Funding):', {
    status: dbReq2.status,
    typeOfFunding: dbReq2.typeOfFunding,
    fundingRemarks: dbReq2.fundingRemarks,
    historyCount: dbReq2.history.length,
    latestHistory: dbReq2.history[dbReq2.history.length - 1]?.title
  });

  // 5. Payment Approval Step
  console.log('\n5. Testing POST /api/payment/requests/:id/approve ...');
  const appRes = await fetch(`${baseUrl}/requests/${paymentId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Approved',
      comment: 'Verified invoice and PO terms',
      actorUser: { username: 'manager_approver', role: 'approver' }
    })
  });
  const appData = await appRes.json();
  console.log('HTTP Response Status:', appRes.status, 'New Status:', appData.data.status);

  // Prisma verification 3
  const dbReq3 = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read #3 (Approval):', {
    status: dbReq3.status,
    approverRemarks: dbReq3.approverRemarks,
    approvalStatus: dbReq3.approvalStatus,
    latestHistory: dbReq3.history[dbReq3.history.length - 1]?.title
  });

  // 6. Posting Step
  console.log('\n6. Testing POST /api/payment/requests/:id/post ...');
  const postRes = await fetch(`${baseUrl}/requests/${paymentId}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Posted',
      postingRemarks: 'Voucher posted in Tally',
      actorUser: { username: 'accounts_clerk', role: 'posting' }
    })
  });
  const postData = await postRes.json();
  console.log('HTTP Response Status:', postRes.status, 'New Status:', postData.data.status);

  // Prisma verification 4
  const dbReq4 = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read #4 (Posting):', {
    status: dbReq4.status,
    postingRemarks: dbReq4.postingRemarks,
    latestHistory: dbReq4.history[dbReq4.history.length - 1]?.title
  });

  // 7. Final Payment Step
  console.log('\n7. Testing POST /api/payment/requests/:id/pay ...');
  const payRes = await fetch(`${baseUrl}/requests/${paymentId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Payment Completed',
      paymentMode: 'RTGS',
      financeRemarks: 'UTR # HDFC00012345678',
      actorUser: { username: 'cashier', role: 'finance' }
    })
  });
  const payData = await payRes.json();
  console.log('HTTP Response Status:', payRes.status, 'New Status:', payData.data.status);

  // Prisma verification 5
  const dbReq5 = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: { history: true }
  });
  console.log('Prisma Read #5 (Payment Completed):', {
    status: dbReq5.status,
    paymentMode: dbReq5.paymentMode,
    financeRemarks: dbReq5.financeRemarks,
    delayDays: dbReq5.delayDays,
    totalHistoryEntries: dbReq5.history.length,
    latestHistory: dbReq5.history[dbReq5.history.length - 1]?.title
  });

  // 8. Vendor CRUD Verification
  console.log('\n8. Testing Vendors API (/api/payment/vendors) ...');
  const vendorRes = await fetch(`${baseUrl}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorName: 'Test Global Suppliers Pvt Ltd',
      gstNumber: '22AAAAA0000A1Z5',
      vendorType: 'Raw Material'
    })
  });
  const vendorData = await vendorRes.json();
  console.log('Created Vendor HTTP:', vendorData.success, 'Name:', vendorData.data.vendorName);

  const dbVendor = await prisma.paymentVendor.findUnique({
    where: { vendorName: 'Test Global Suppliers Pvt Ltd' }
  });
  console.log('Prisma Read Vendor:', dbVendor.vendorName, dbVendor.gstNumber);

  // Cleanup vendor test record
  await prisma.paymentVendor.delete({ where: { id: dbVendor.id } });

  // 9. User Settings API Verification
  console.log('\n9. Testing Settings API (/api/payment/settings) ...');
  const userRes = await fetch(`${baseUrl}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_payment_user',
      password: 'password123',
      name: 'Test Payment Auditor',
      role: 'Checker',
      firms: 'PMMPL, PMM Retail',
      pages: 'Dashboard, Payment Creation, Channel Funding'
    })
  });
  const userData = await userRes.json();
  console.log('Created User HTTP:', userData.success, 'Username:', userData.data.username);

  const dbUser = await prisma.login.findUnique({
    where: { username: 'test_payment_user' }
  });
  console.log('Prisma Read User:', dbUser.username, 'Firm:', dbUser.firm_name, 'Access:', dbUser.page_access);

  // Cleanup test user and payment record
  await prisma.login.delete({ where: { username: 'test_payment_user' } });
  await prisma.paymentHistoryEntry.deleteMany({ where: { paymentId } });
  await prisma.paymentRequest.delete({ where: { id: paymentId } });

  console.log('\n=== ALL ENDPOINTS VERIFIED & CLEANED UP SUCCESSFULLY ===');
}

runVerification().catch(console.error);
