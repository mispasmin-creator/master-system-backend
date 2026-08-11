const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

const SERVICES_MASTER_DATA = [
  { department: "Akoli", groupHead: "Airtel", firmName: "Pmmpl", fmsName: "Repair FMS" },
  { department: "Hirapur", groupHead: "Jio", firmName: "Rkl", fmsName: "Store FMS" },
  { department: "Babylon", groupHead: "Electricity", firmName: "Purab", fmsName: "Purchase FMS Po Advance" },
  { department: "Crystal Arcade", groupHead: "Rent", firmName: "Refrasynth", fmsName: "Fixed Asset FMS Advance" },
  { department: "DM Tower", groupHead: "Grocery Items", firmName: "Refratech", fmsName: "Travel FMS" },
  { department: "Shree Ram Park", groupHead: "Water Pa", firmName: null, fmsName: "Advance FMS Employee" },
  { department: "B/03 Sumeet City Of Dreams", groupHead: "Vi", firmName: null, fmsName: "Car FMS" },
  { department: "Shree Ram Park Block-C", groupHead: "Maintanance", firmName: null, fmsName: "Sent Truck FMS" },
  { department: "F-14 Rama World", groupHead: "Cleaning", firmName: null, fmsName: "Labour Payment FMS" },
  { department: "A11", groupHead: "Elxer", firmName: null, fmsName: "Sales Expenses FMS" },
  { department: "NRM", groupHead: "Internet", firmName: null, fmsName: "Subscription FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Service FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Fixed Asset Against PI" },
  { department: null, groupHead: null, firmName: null, fmsName: "Purchase From Management" },
  { department: null, groupHead: null, firmName: null, fmsName: "Utility FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "All Vendors Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "All Freight Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "Application Order FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Application Order FMS Advance" },
  { department: null, groupHead: null, firmName: null, fmsName: "Fuel FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Store FMS Freight" },
  { department: null, groupHead: null, firmName: null, fmsName: "Transfer Material" },
  { department: null, groupHead: null, firmName: null, fmsName: "New Fixed Asset FMS Freight" },
  { department: null, groupHead: null, firmName: null, fmsName: "Application Order To Collection Freight" },
  { department: null, groupHead: null, firmName: null, fmsName: "Government Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "Director Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "Credit Card Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "HR FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Pasmin Payroll V.2" },
  { department: null, groupHead: null, firmName: null, fmsName: "Sales Commission FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Repair FMS Freight" },
  { department: null, groupHead: null, firmName: null, fmsName: "New Repair FMS PMMPL V.2" },
  { department: null, groupHead: null, firmName: null, fmsName: "Material Purchase From Management FMS" },
  { department: null, groupHead: null, firmName: null, fmsName: "Material Return" },
  { department: null, groupHead: null, firmName: null, fmsName: "Sales of Raw Material" },
  { department: null, groupHead: null, firmName: null, fmsName: "New Sales Expenses FMS V.02" },
  { department: null, groupHead: null, firmName: null, fmsName: "Incentive Payment FMS Pasmin" },
  { department: null, groupHead: null, firmName: null, fmsName: "Subscription FMS Pasmin Realty" },
  { department: null, groupHead: null, firmName: null, fmsName: "Store FMS Office" },
  { department: null, groupHead: null, firmName: null, fmsName: "Store FMS React Freight" },
  { department: null, groupHead: null, firmName: null, fmsName: "Fixed Asset React Freight Payment" },
  { department: null, groupHead: null, firmName: null, fmsName: "Fixed Asset FMS Advance React" },
  { department: null, groupHead: null, firmName: null, fmsName: "Store FMS React V.01" },
  { department: null, groupHead: null, firmName: null, fmsName: "HR Application" },
  { department: null, groupHead: null, firmName: null, fmsName: "New Freight Payment Application" }
];

async function seedMasterData() {
  console.log('=== SEEDING SERVICES MASTER DROPDOWN DATA ===\n');

  await prisma.serviceMasterDropdown.deleteMany({});

  const result = await prisma.serviceMasterDropdown.createMany({
    data: SERVICES_MASTER_DATA
  });

  const count = await prisma.serviceMasterDropdown.count();

  console.log(`Successfully seeded ${result.count} rows into ServiceMasterDropdown.`);
  console.log(`Current DB Count in ServiceMasterDropdown: ${count}`);
  console.log('Match target count (45 rows):', count === 45 ? 'PASS ✅' : 'FAIL ❌');

  return count;
}

seedMasterData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
