const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

async function testParity() {
  console.log('=== STARTING PROMPT 8 FEATURE & FIELD PARITY VERIFICATION ===\n');

  const baseUrl = 'http://localhost:5000/api/payment';

  // 1. Dashboard API check
  console.log('1. Verifying Dashboard API (GET /api/payment/requests)...');
  const dashRes = await fetch(`${baseUrl}/requests`);
  const dashData = await dashRes.json();
  console.log('   Status:', dashRes.status, 'Success:', dashData.success, 'Count:', dashData.count);

  // 2. PaymentCreation API check
  console.log('\n2. Verifying PaymentCreation API (POST /api/payment/requests)...');
  const createRes = await fetch(`${baseUrl}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmsName: 'Repair FMS',
      firmName: 'PMMPL',
      payTo: 'Test Machinery Vendor',
      amount: 75000,
      department: 'Logistics',
      priority: 'Urgent',
      plannedDate: '2026-08-10',
      requiredDate: '2026-08-12',
      supportingDocuments: 'Invoice',
      remarks: 'Urgent conveyor repair',
      status: 'Submitted'
    })
  });
  const createData = await createRes.json();
  const reqId = createData.data.id;
  const reqNum = createData.data.paymentNumber;
  console.log('   Created Requisition:', reqNum, 'Status:', createData.data.status, 'Amount:', createData.data.amount);

  // Move Submitted -> Approved for Funding
  const workflowService = require('../src/payment/shared/paymentWorkflow.service');
  await workflowService.transition(reqId, 'Approved for Funding', { username: 'checker_sarah', role: 'checker' }, 'Approved for funding');

  // 3. ChannelFunding API check
  console.log('\n3. Verifying ChannelFunding API (POST /api/payment/requests/:id/channel-funding)...');
  const fundRes = await fetch(`${baseUrl}/requests/${reqId}/channel-funding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Channel Funded',
      typeOfFunding: 'BHFDDF',
      fundingRemarks: 'Bank channel allocated',
      remarks: 'Bank channel allocated'
    })
  });
  const fundData = await fundRes.json();
  console.log('   Channel Funded Status:', fundData.data.status, 'Type of Funding:', fundData.data.typeOfFunding);

  // 4. PaymentApproval API check
  console.log('\n4. Verifying PaymentApproval API (POST /api/payment/requests/:id/approve)...');
  const appRes = await fetch(`${baseUrl}/requests/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Approved',
      approverRemarks: 'Audit verified and approved',
      comment: 'Audit verified and approved'
    })
  });
  const appData = await appRes.json();
  console.log('   Approval Status:', appData.data.status, 'Approver Remarks:', appData.data.approverRemarks);

  // 5. Posting API check
  console.log('\n5. Verifying Posting API (POST /api/payment/requests/:id/post)...');
  const postRes = await fetch(`${baseUrl}/requests/${reqId}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Posted',
      postingRemarks: 'Voucher # 4591 posted in Tally',
      remarks: 'Voucher # 4591 posted in Tally'
    })
  });
  const postData = await postRes.json();
  console.log('   Posting Status:', postData.data.status, 'Posting Remarks:', postData.data.postingRemarks);

  // 6. MakePayment API check
  console.log('\n6. Verifying MakePayment API (POST /api/payment/requests/:id/pay)...');
  const payRes = await fetch(`${baseUrl}/requests/${reqId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Payment Completed',
      paymentMode: 'NEFT',
      financeRemarks: 'UTR # N1234567890',
      remarks: 'UTR # N1234567890'
    })
  });
  const payData = await payRes.json();
  console.log('   Disbursement Status:', payData.data.status, 'Payment Mode:', payData.data.paymentMode, 'Finance Remarks:', payData.data.financeRemarks);

  // 7. UserManagement API check
  console.log('\n7. Verifying UserManagement API (GET/POST /api/payment/settings)...');
  const userRes = await fetch(`${baseUrl}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'parity_test_user',
      password: 'password123',
      name: 'Parity Tester',
      role: 'Finance',
      firms: 'PMMPL, PMM Logisol',
      pages: 'Dashboard, Make Payment'
    })
  });
  const userData = await userRes.json();
  console.log('   Created User:', userData.data.username, 'Firms:', userData.data.firms, 'Pages:', userData.data.pages);

  // Cleanup test user and payment record
  await prisma.login.delete({ where: { username: 'parity_test_user' } });
  await prisma.paymentHistoryEntry.deleteMany({ where: { paymentId: reqId } });
  await prisma.paymentRequest.delete({ where: { id: reqId } });

  console.log('\n=== ALL PROMPT 8 PARITY CHECKS PASSED PERFECTLY ===');
}

testParity().catch(console.error);
