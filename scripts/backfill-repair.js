const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const { deriveRepairStatus, calculateDelay } = require('../src/repair/shared/repairWorkflow.service');
const bcrypt = require('bcryptjs');

const INITIAL_REPAIR_TASKS = [
  {
    taskNo: 'TS-001',
    firmName: 'Pmmpl',
    serialNo: 'LM-9901',
    machineName: 'Lathe Machine 01',
    machinePartName: 'Spindle Motor',
    givenBy: 'Supervisor R',
    doerName: 'Technician A',
    problem: 'Vibration and noise during high RPM operation',
    priority: 'High',
    department: 'Maintenance',
    location: 'Plant Floor 1',
    planned: '2026-08-01',
    actual: '2026-08-03',
    vendorName: 'Acme Repair Workshop',
    leadTimeToDeliverDays: 7,
    transporterName: 'VRL Logistics',
    transportationCharges: 2000,
    paymentType: 'Advance',
    howMuch: 1000,
    planned1: '2026-08-08',
    actual1: '2026-08-08',
    returnTransporterName: 'VRL Logistics',
    transportationAmount: 1500,
    billNo: 'INV-ACME-101',
    typeOfBill: 'Service Bill',
    totalBillAmount: 12000,
    toBePaidAmount: 11000,
    planned2: '2026-08-09',
    actual2: '2026-08-09',
    receivedQuantity: 1,
    billMatch: 'Yes',
    planned4: '2026-08-10',
    actual4: '2026-08-10',
    status1: 'Complete',
    remarks1: 'Audited and verified',
    status2: 'Complete',
    remarks2: 'Receipt confirmed by Store HOD',
    status3: 'Complete',
    remarks3: 'Re-audit verified',
    status4: 'Complete',
    remarks4: 'Tally entry posted'
  },
  {
    taskNo: 'TS-002',
    firmName: 'Rkl',
    serialNo: 'VMC-8802',
    machineName: 'VMC Machine 02',
    machinePartName: 'Coolant Pump',
    givenBy: 'Manager S',
    doerName: 'Technician B',
    problem: 'Coolant pressure drop under load',
    priority: 'Critical',
    department: 'Machining',
    location: 'Plant Floor 2',
    planned: '2026-08-05',
    actual: '2026-08-07',
    vendorName: 'Global Repair Solutions',
    leadTimeToDeliverDays: 5,
    transporterName: 'Express Cargo',
    transportationCharges: 1800,
    paymentType: 'Advance',
    howMuch: 500,
    planned1: '2026-08-11',
    actual1: '2026-08-11',
    returnTransporterName: 'Express Cargo',
    transportationAmount: 1200,
    billNo: 'BILL-GRS-304',
    typeOfBill: 'Repair Invoice',
    totalBillAmount: 8500,
    toBePaidAmount: 8000,
    planned2: '2026-08-12',
    actual2: null,
    receivedQuantity: null,
    billMatch: 'Pending',
    planned4: null,
    actual4: null
  },
  {
    taskNo: 'TS-003',
    firmName: 'Purab',
    serialNo: 'CNC-7703',
    machineName: 'CNC Milling 01',
    machinePartName: 'Hydraulic Cylinder',
    givenBy: 'Supervisor K',
    doerName: 'Technician C',
    problem: 'Hydraulic seal leak',
    priority: 'Medium',
    department: 'Production',
    location: 'Shop 3',
    planned: '2026-08-09',
    actual: null,
    vendorName: 'Apex Machinery Services',
    leadTimeToDeliverDays: 10,
    transporterName: null,
    transportationCharges: null,
    paymentType: 'Credit',
    howMuch: null
  }
];

const INITIAL_ADVANCE_PAYMENTS = [
  {
    paymentNo: 'PN-001',
    taskNo: 'TS-001',
    firmName: 'Pmmpl',
    serialNo: 'LM-9901',
    machineName: 'Lathe Machine 01',
    vendorName: 'Acme Repair Workshop',
    billNo: 'INV-ACME-101',
    totalBillAmount: 12000,
    toBePaidAmount: 11000,
    paymentType: 'Advance',
    amount: 1000,
    paidTo: 'Acme Repair Workshop',
    paymentMode: 'Bank Transfer',
    remarks: 'Advance paid at dispatch',
    paidDate: new Date('2026-08-03')
  },
  {
    paymentNo: 'PN-002',
    taskNo: 'TS-002',
    firmName: 'Rkl',
    serialNo: 'VMC-8802',
    machineName: 'VMC Machine 02',
    vendorName: 'Global Repair Solutions',
    billNo: 'BILL-GRS-304',
    totalBillAmount: 8500,
    toBePaidAmount: 8000,
    paymentType: 'Advance',
    amount: 500,
    paidTo: 'Global Repair Solutions',
    paymentMode: 'UPI',
    remarks: 'Advance token payment',
    paidDate: new Date('2026-08-07')
  }
];

const REPAIR_USERS = [
  {
    username: 'repair_admin',
    password: 'password123',
    role: 'admin',
    page_access: 'all',
    firm_name: 'all'
  },
  {
    username: 'repair_user',
    password: 'password123',
    role: 'user',
    page_access: 'Repair_Dashboard, Repair_Indent, Repair_SentToVendor, Repair_CheckMachine, Repair_StoreIn, Repair_MakePayment, Repair_Accounts',
    firm_name: 'Pmmpl'
  }
];

async function runBackfill() {
  console.log('=== SEEDING & BACKFILLING REPAIR MODULE DATA ===\n');

  // 1. Backfill Login Users for Repair module
  console.log('1. Backfilling Repair Login Users...');
  let seededUsersCount = 0;
  for (const u of REPAIR_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.login.upsert({
      where: { username: u.username },
      update: {
        role: u.role,
        page_access: u.page_access,
        firm_name: u.firm_name
      },
      create: {
        username: u.username,
        password: hashedPassword,
        role: u.role,
        page_access: u.page_access,
        firm_name: u.firm_name
      }
    });
    seededUsersCount++;
  }
  console.log(`   Processed ${seededUsersCount} Repair Users in Login table.`);

  // 2. Backfill RepairTask records with re-derived status and delay calculations
  console.log('\n2. Backfilling RepairTask records...');
  let seededTasksCount = 0;
  for (const t of INITIAL_REPAIR_TASKS) {
    const pDate = t.planned ? new Date(t.planned) : null;
    const aDate = t.actual ? new Date(t.actual) : null;
    const delay = calculateDelay(pDate, aDate);

    const pDate1 = t.planned1 ? new Date(t.planned1) : null;
    const aDate1 = t.actual1 ? new Date(t.actual1) : null;

    const pDate2 = t.planned2 ? new Date(t.planned2) : null;
    const aDate2 = t.actual2 ? new Date(t.actual2) : null;
    const delay2 = calculateDelay(pDate2, aDate2);

    const pDate4 = t.planned4 ? new Date(t.planned4) : null;
    const aDate4 = t.actual4 ? new Date(t.actual4) : null;

    // Re-derive overall status
    const status = deriveRepairStatus({ actual4: aDate4 });

    await prisma.repairTask.upsert({
      where: { taskNo: t.taskNo },
      update: {
        firmName: t.firmName,
        serialNo: t.serialNo,
        machineName: t.machineName,
        machinePartName: t.machinePartName,
        givenBy: t.givenBy,
        doerName: t.doerName,
        problem: t.problem,
        priority: t.priority,
        department: t.department,
        location: t.location,
        planned: pDate,
        actual: aDate,
        delay,
        vendorName: t.vendorName,
        leadTimeToDeliverDays: t.leadTimeToDeliverDays,
        transporterName: t.transporterName,
        transportationCharges: t.transportationCharges,
        paymentType: t.paymentType,
        howMuch: t.howMuch,
        planned1: pDate1,
        actual1: aDate1,
        returnTransporterName: t.returnTransporterName,
        transportationAmount: t.transportationAmount,
        billNo: t.billNo,
        typeOfBill: t.typeOfBill,
        totalBillAmount: t.totalBillAmount,
        toBePaidAmount: t.toBePaidAmount,
        planned2: pDate2,
        actual2: aDate2,
        delay2,
        receivedQuantity: t.receivedQuantity,
        billMatch: t.billMatch,
        planned4: pDate4,
        actual4: aDate4,
        status1: t.status1,
        remarks1: t.remarks1,
        status2: t.status2,
        remarks2: t.remarks2,
        status3: t.status3,
        remarks3: t.remarks3,
        status4: t.status4,
        remarks4: t.remarks4,
        status
      },
      create: {
        taskNo: t.taskNo,
        firmName: t.firmName,
        serialNo: t.serialNo,
        machineName: t.machineName,
        machinePartName: t.machinePartName,
        givenBy: t.givenBy,
        doerName: t.doerName,
        problem: t.problem,
        priority: t.priority,
        department: t.department,
        location: t.location,
        planned: pDate,
        actual: aDate,
        delay,
        vendorName: t.vendorName,
        leadTimeToDeliverDays: t.leadTimeToDeliverDays,
        transporterName: t.transporterName,
        transportationCharges: t.transportationCharges,
        paymentType: t.paymentType,
        howMuch: t.howMuch,
        planned1: pDate1,
        actual1: aDate1,
        returnTransporterName: t.returnTransporterName,
        transportationAmount: t.transportationAmount,
        billNo: t.billNo,
        typeOfBill: t.typeOfBill,
        totalBillAmount: t.totalBillAmount,
        toBePaidAmount: t.toBePaidAmount,
        planned2: pDate2,
        actual2: aDate2,
        delay2,
        receivedQuantity: t.receivedQuantity,
        billMatch: t.billMatch,
        planned4: pDate4,
        actual4: aDate4,
        status1: t.status1,
        remarks1: t.remarks1,
        status2: t.status2,
        remarks2: t.remarks2,
        status3: t.status3,
        remarks3: t.remarks3,
        status4: t.status4,
        remarks4: t.remarks4,
        status
      }
    });
    seededTasksCount++;
  }
  console.log(`   Seeded/upserted ${seededTasksCount} RepairTask records.`);

  // 3. Backfill RepairAdvancePayment records linked to tasks
  console.log('\n3. Backfilling RepairAdvancePayment records...');
  let seededPaymentsCount = 0;
  for (const p of INITIAL_ADVANCE_PAYMENTS) {
    const parentTask = await prisma.repairTask.findFirst({ where: { taskNo: p.taskNo } });
    const existing = await prisma.repairAdvancePayment.findFirst({ where: { paymentNo: p.paymentNo } });

    if (existing) {
      await prisma.repairAdvancePayment.update({
        where: { id: existing.id },
        data: {
          taskId: parentTask ? parentTask.id : null,
          taskNo: p.taskNo,
          firmName: p.firmName,
          serialNo: p.serialNo,
          machineName: p.machineName,
          vendorName: p.vendorName,
          billNo: p.billNo,
          totalBillAmount: p.totalBillAmount,
          toBePaidAmount: p.toBePaidAmount,
          paymentType: p.paymentType,
          amount: p.amount,
          paidTo: p.paidTo,
          paymentMode: p.paymentMode,
          remarks: p.remarks,
          paidDate: p.paidDate
        }
      });
    } else {
      await prisma.repairAdvancePayment.create({
        data: {
          paymentNo: p.paymentNo,
          taskId: parentTask ? parentTask.id : null,
          taskNo: p.taskNo,
          firmName: p.firmName,
          serialNo: p.serialNo,
          machineName: p.machineName,
          vendorName: p.vendorName,
          billNo: p.billNo,
          totalBillAmount: p.totalBillAmount,
          toBePaidAmount: p.toBePaidAmount,
          paymentType: p.paymentType,
          amount: p.amount,
          paidTo: p.paidTo,
          paymentMode: p.paymentMode,
          remarks: p.remarks,
          paidDate: p.paidDate
        }
      });
    }
    seededPaymentsCount++;
  }
  console.log(`   Seeded/upserted ${seededPaymentsCount} RepairAdvancePayment records.`);

  // 4. Report Final Model Counts
  console.log('\n=== FINAL REPAIR MODEL ROW COUNTS ===');
  const taskTotalCount = await prisma.repairTask.count();
  const advanceTotalCount = await prisma.repairAdvancePayment.count();
  const masterTotalCount = await prisma.repairMasterDropdown.count();
  const loginTotalCount = await prisma.login.count();

  console.log(`- RepairTask count: ${taskTotalCount}`);
  console.log(`- RepairAdvancePayment count: ${advanceTotalCount}`);
  console.log(`- RepairMasterDropdown count: ${masterTotalCount}`);
  console.log(`- Login count: ${loginTotalCount}`);

  return { taskTotalCount, advanceTotalCount, masterTotalCount, loginTotalCount };
}

runBackfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
