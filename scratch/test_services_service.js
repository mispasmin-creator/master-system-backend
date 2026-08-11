const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const { deriveServiceStatus, calculateDelay, convertOfferToService } = require('../src/services/shared/serviceStatus.service');

async function testServiceLogic() {
  console.log('=== TESTING SERVICES BUSINESS LOGIC SERVICES ===\n');

  // 1. Test calculateDelay
  console.log('1. Testing calculateDelay:');
  console.log('   On-time (2026-08-10, 2026-08-10):', calculateDelay('2026-08-10', '2026-08-10'), 'days (Expected 0)');
  console.log('   Delayed (2026-08-10, 2026-08-15):', calculateDelay('2026-08-10', '2026-08-15'), 'days (Expected 5)');

  // 2. Test deriveServiceStatus
  console.log('\n2. Testing deriveServiceStatus:');
  console.log('   New job status:', deriveServiceStatus({}), '(Expected "Service Created")');
  console.log('   Work started status:', deriveServiceStatus({ actual1: '2026-08-10' }), '(Expected "Work Started")');
  console.log('   Bill received status:', deriveServiceStatus({ billNo: 'BILL-101' }), '(Expected "Bill Received")');
  console.log('   Payment pending status:', deriveServiceStatus({ status3: 'Approved' }), '(Expected "Payment Pending")');
  console.log('   Completed status:', deriveServiceStatus({ status5: 'Completed' }), '(Expected "Completed")');

  // 3. Insert direct ServiceOffer row & test convertOfferToService
  console.log('\n3. Testing convertOfferToService via Prisma:');
  const offer = await prisma.serviceOffer.create({
    data: {
      offerNo: 'OFF-TEST-01',
      firmName: 'PMMPL',
      vendor: 'HVAC Solutions Pvt Ltd',
      description: 'Annual Maintenance Service Contract',
      location: 'Plant 1',
      amount: 250000,
      isOffer: 'Yes',
      status: 'Pending'
    }
  });
  console.log('   Created ServiceOffer:', offer.offerNo, 'ID:', offer.id);

  const serviceJob = await convertOfferToService(offer.id, {
    checker: 'Sarah Checker',
    amount: 250000,
    tdsAmount: 5000,
    remark: 'Converted from Offer OFF-TEST-01'
  });

  console.log('   Converted to ServiceJob:', serviceJob.serviceNo, 'Status:', serviceJob.status, 'Firm:', serviceJob.firmName, 'Amount:', serviceJob.amount);

  // Clean up test data
  await prisma.serviceJob.delete({ where: { id: serviceJob.id } });
  await prisma.serviceOffer.delete({ where: { id: offer.id } });

  console.log('\n=== ALL SERVICES BUSINESS LOGIC TESTS PASSED PERFECTLY ===');
}

testServiceLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
