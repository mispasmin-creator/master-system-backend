const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

const VENDORS_SEED = [
  {
    vendorName: 'Acme Corp',
    vendorType: 'Manufacturer',
    gstNumber: '27AAAAA1111A1Z1',
    panNumber: 'AAAAA1111A',
    mobileNumber: '9876543201',
    email: 'info@acme.com',
    address: '123 Industrial Area, Mumbai',
    status: 'Active'
  },
  {
    vendorName: 'Global Logistics',
    vendorType: 'Service Provider',
    gstNumber: '27BBBBB2222B2Z2',
    panNumber: 'BBBBB2222B',
    mobileNumber: '9876543202',
    email: 'billing@globallogistics.com',
    address: '456 Port Road, Chennai',
    status: 'Active'
  },
  {
    vendorName: 'Prime Solutions',
    vendorType: 'Consultant',
    gstNumber: '27CCCCC3333C3Z3',
    panNumber: 'CCCCC3333C',
    mobileNumber: '9876543203',
    email: 'contact@primesolutions.com',
    address: '789 Tech Park, Bangalore',
    status: 'Active'
  },
  {
    vendorName: 'Delta Tech Ltd',
    vendorType: 'Distributor',
    gstNumber: '27DDDDD4444D4Z4',
    panNumber: 'DDDDD4444D',
    mobileNumber: '9876543204',
    email: 'support@deltatech.com',
    address: '101 Cyber City, Hyderabad',
    status: 'Active'
  }
];

const MASTER_SEED = [
  { fmsName: 'Repair FMS', firmName: 'Pmmpl', typeOfFunding: 'GDFSFY', paymentMode: 'NEFT' },
  { fmsName: 'Store FMS', firmName: 'RKL', typeOfFunding: 'BHFDDF', paymentMode: 'RTGS' },
  { fmsName: 'Purchase FMS Po Advance', firmName: 'Purab', typeOfFunding: 'AFAFAEF', paymentMode: 'IMPS' },
  { fmsName: 'Fixed Asset FMS Advance', firmName: 'Refrasynth', typeOfFunding: 'AEAFAEFA', paymentMode: 'UPI' },
  { fmsName: 'Travel FMS', firmName: null, typeOfFunding: 'EAF', paymentMode: 'Cash' },
  { fmsName: 'Advance FMS Employee', firmName: null, typeOfFunding: null, paymentMode: 'Cheque' },
  { fmsName: 'Car FMS', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Sent Truck FMS', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Labour Payment Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Sales Expenses Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Subscription FMS', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Service FMS', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Fixed Asset Against PI', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Purchase From Management', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Utility Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'All Vendors Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'All Freight Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Application Order Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Application Order Fms Advance', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Fuel Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Store Fms Freight', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Transfer Material', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'New Fixed Asset Fms Freight', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Application Order To Collection Freight', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Government Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Director Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Credit Card Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Hr Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Pasmin Payroll V.2', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Sales Commission Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Repair Fms Freight', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'New Repair Fms Pmmpl V.2', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Material Purchase From Management Fms', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Material Return', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Sales of Raw Material', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'New Sales Expenses Fms V.02', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Incentive Payment FMS Pasmin', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Subscription FMS Pasmin Realty', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Store FMS Office', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Store FMS React Freight', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Fixed Asset React Freight Payment', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Fixed Asset FMS Advance React', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Store FMS React V.01', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'Hr Application', firmName: null, typeOfFunding: null, paymentMode: null },
  { fmsName: 'New Freight Payment Application', firmName: null, typeOfFunding: null, paymentMode: null }
];

async function seedMasterData() {
  console.log('=== SEEDING MAKE PAYMENT VENDOR & MASTER DATA ===\n');

  // 1. Seed Vendors
  console.log('1. Seeding PaymentVendor table...');
  await prisma.paymentVendor.deleteMany({});
  const vendorResult = await prisma.paymentVendor.createMany({
    data: VENDORS_SEED,
    skipDuplicates: true
  });
  const vendorCount = await prisma.paymentVendor.count();
  console.log(`PaymentVendor inserted: ${vendorResult.count} rows. Total count in DB: ${vendorCount}`);
  console.log(`Source SQL Vendor INSERT count: ${VENDORS_SEED.length}. Count Match: ${vendorCount === VENDORS_SEED.length ? 'YES ✅' : 'NO ❌'}`);

  // 2. Seed Master Dropdowns
  console.log('\n2. Seeding PaymentFmsMaster table...');
  await prisma.paymentFmsMaster.deleteMany({});
  const masterResult = await prisma.paymentFmsMaster.createMany({
    data: MASTER_SEED
  });
  const masterCount = await prisma.paymentFmsMaster.count();
  console.log(`PaymentFmsMaster inserted: ${masterResult.count} rows. Total count in DB: ${masterCount}`);
  console.log(`Source SQL Master INSERT count: ${MASTER_SEED.length}. Count Match: ${masterCount === MASTER_SEED.length ? 'YES ✅' : 'NO ❌'}`);

  console.log('\n=== SEED COMPLETED SUCCESSFULLY ===');
}

seedMasterData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
