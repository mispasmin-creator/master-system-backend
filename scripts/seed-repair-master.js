const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

const REPAIR_MASTER_DATA = [
  // Master Departments
  { department: "Maintenance", firmName: "Pmmpl", vendorName: null, transporterName: null, machineName: null },
  { department: "Production", firmName: "Rkl", vendorName: null, transporterName: null, machineName: null },
  { department: "Machining", firmName: "Purab", vendorName: null, transporterName: null, machineName: null },
  { department: "Quality", firmName: "Refrasynth", vendorName: null, transporterName: null, machineName: null },
  { department: "Store", firmName: "Refratech", vendorName: null, transporterName: null, machineName: null },
  { department: "Electrical", firmName: null, vendorName: null, transporterName: null, machineName: null },
  { department: "Mechanical", firmName: null, vendorName: null, transporterName: null, machineName: null },

  // Master Vendors
  { department: null, firmName: null, vendorName: "Acme Repairs", transporterName: null, machineName: null },
  { department: null, firmName: null, vendorName: "Global Repair Solutions", transporterName: null, machineName: null },
  { department: null, firmName: null, vendorName: "Apex Machinery Services", transporterName: null, machineName: null },
  { department: null, firmName: null, vendorName: "Precision Tech", transporterName: null, machineName: null },
  { department: null, firmName: null, vendorName: "National Engineering Works", transporterName: null, machineName: null },

  // Master Transporters
  { department: null, firmName: null, vendorName: null, transporterName: "DHL Express", machineName: null },
  { department: null, firmName: null, vendorName: null, transporterName: "VRL Logistics", machineName: null },
  { department: null, firmName: null, vendorName: null, transporterName: "Express Cargo", machineName: null },
  { department: null, firmName: null, vendorName: null, transporterName: "Blue Dart", machineName: null },
  { department: null, firmName: null, vendorName: null, transporterName: "SafeExpress", machineName: null },

  // Master Machine Names
  { department: null, firmName: null, vendorName: null, transporterName: null, machineName: "Lathe Machine 01" },
  { department: null, firmName: null, vendorName: null, transporterName: null, machineName: "VMC Machine 02" },
  { department: null, firmName: null, vendorName: null, transporterName: null, machineName: "CNC Milling 01" },
  { department: null, firmName: null, vendorName: null, transporterName: null, machineName: "Hydraulic Press 05" },
  { department: null, firmName: null, vendorName: null, transporterName: null, machineName: "Grinding Machine 03" }
];

async function seedMasterData() {
  console.log('=== SEEDING REPAIR MASTER DROPDOWN DATA ===\n');

  await prisma.repairMasterDropdown.deleteMany({});

  const result = await prisma.repairMasterDropdown.createMany({
    data: REPAIR_MASTER_DATA
  });

  const count = await prisma.repairMasterDropdown.count();

  console.log(`Successfully seeded ${result.count} rows into RepairMasterDropdown.`);
  console.log(`Current DB Count in RepairMasterDropdown: ${count}`);

  return count;
}

seedMasterData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
