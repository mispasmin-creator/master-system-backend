const { prisma } = require('../src/config/db');

async function seed5FreightItems() {
  console.log('🚀 Seeding 5 test items across Indent -> StoreIn -> FullKitting -> FreightPayment -> Payments...');

  const itemsData = [
    {
      indentNumber: 'SI-0101',
      productName: 'Cable 1.5mm',
      qty: 50,
      vendorName: 'Indus Trade',
      billNo: 'BILL-101',
      transporterName: 'VRL Logistics',
      vehicleNo: 'KA-01-AB-1234',
      driverName: 'Ramesh Kumar',
      driverMobileNo: '9876543210',
      freightAmount: 1200,
      poNumber: 'STORE-PO-25-26-101',
      firmNameMatch: 'Refrasynth'
    },
    {
      indentNumber: 'SI-0102',
      productName: 'Chamber Filter Press',
      qty: 10,
      vendorName: 'Indian Oil',
      billNo: 'BILL-102',
      transporterName: 'TCI Freight',
      vehicleNo: 'MH-12-CD-5678',
      driverName: 'Suresh Singh',
      driverMobileNo: '9876543211',
      freightAmount: 3500,
      poNumber: 'STORE-PO-25-26-102',
      firmNameMatch: 'Refrasynth'
    },
    {
      indentNumber: 'SI-0103',
      productName: 'Helmet Safety',
      qty: 100,
      vendorName: 'GA Industrial',
      billNo: 'BILL-103',
      transporterName: 'GATI Express',
      vehicleNo: 'DL-01-EF-9012',
      driverName: 'Mahesh Patel',
      driverMobileNo: '9876543212',
      freightAmount: 850,
      poNumber: 'STORE-PO-25-26-103',
      firmNameMatch: 'Refrasynth'
    },
    {
      indentNumber: 'SI-0104',
      productName: 'Bearing 6204',
      qty: 25,
      vendorName: 'RKL Supplier',
      billNo: 'BILL-104',
      transporterName: 'SafeExpress Cargo',
      vehicleNo: 'WB-02-GH-3456',
      driverName: 'Dinesh Sharma',
      driverMobileNo: '9876543213',
      freightAmount: 2100,
      poNumber: 'STORE-PO-25-26-104',
      firmNameMatch: 'Refrasynth'
    },
    {
      indentNumber: 'SI-0105',
      productName: 'Valve 2 Inch',
      qty: 5,
      vendorName: 'Ex-Factory Vendor',
      billNo: 'BILL-105',
      transporterName: 'BlueDart Cargo',
      vehicleNo: 'HR-26-IJ-7890',
      driverName: 'Rajesh Verma',
      driverMobileNo: '9876543214',
      freightAmount: 1500,
      poNumber: 'STORE-PO-25-26-105',
      firmNameMatch: 'Refrasynth'
    }
  ];

  const now = new Date();
  const nowIso = now.toISOString();

  for (let i = 0; i < itemsData.length; i++) {
    const item = itemsData[i];
    const liftNum = `LIFT-${String(100 + i + 1).padStart(4, '0')}`;

    // 1. Create or update Indent
    const indent = await prisma.refrasynthIndent.upsert({
      where: { id: 1000 + i + 1 },
      update: {
        indentNumber: item.indentNumber,
        productName: item.productName,
        quantity: item.qty,
        approvedVendorName: item.vendorName,
        poNumber: item.poNumber,
        actual1: nowIso,
        actual2: nowIso,
        actual3: nowIso,
        actual4: nowIso,
        firmNameMatch: item.firmNameMatch,
      },
      create: {
        id: 1000 + i + 1,
        indentNumber: item.indentNumber,
        productName: item.productName,
        quantity: item.qty,
        approvedVendorName: item.vendorName,
        poNumber: item.poNumber,
        actual1: nowIso,
        actual2: nowIso,
        actual3: nowIso,
        actual4: nowIso,
        firmNameMatch: item.firmNameMatch,
      }
    });

    // 2. Create StoreIn record
    const storeIn = await prisma.refrasynthStoreIn.create({
      data: {
        timestamp: now,
        liftNumber: liftNum,
        indentNo: item.indentNumber,
        poNumber: item.poNumber,
        vendorName: item.vendorName,
        productName: item.productName,
        qty: item.qty,
        billNo: item.billNo,
        transportationInclude: 'Yes',
        transporterName: item.transporterName,
        amount: item.freightAmount,
        vehicleNo: item.vehicleNo,
        driverName: item.driverName,
        driverMobileNo: item.driverMobileNo,
        actual6: nowIso,
        plannedHod: nowIso,
        actualHod: nowIso,
        hodStatus: 'Approved',
        firmNameMatch: item.firmNameMatch
      }
    });

    // 3. Create Fullkitting record for Store Freight Payment view (/store/Full-Kiting)
    await prisma.refrasynthFullkitting.create({
      data: {
        timestamp: now,
        indentNumber: item.indentNumber,
        vendorName: item.vendorName,
        productName: item.productName,
        qty: item.qty,
        billNo: item.billNo,
        transportingInclude: 'Yes',
        transporterName: item.transporterName,
        amount: item.freightAmount,
        vehicleNo: item.vehicleNo,
        driverName: item.driverName,
        driverMobileNo: item.driverMobileNo,
        planned: nowIso,
        firmNameMatch: item.firmNameMatch
      }
    });

    // 4. Create FreightPaymentEntry record for Freight Payment Module (/freight-payment)
    await prisma.freightPaymentEntry.create({
      data: {
        uniqueNumber: `FRT-SEED-${100 + i + 1}`,
        paymentNumber: `FRT-SEED-${100 + i + 1}`,
        firmName: item.firmNameMatch,
        transporterName: item.transporterName,
        vehicleNumber: item.vehicleNo,
        biltyNumber: item.billNo,
        amount: item.freightAmount,
        liftId: item.indentNumber,
        partyName: item.transporterName,
        materialLoadDetails: `${item.productName} (${item.poNumber})`,
        fmsName: 'Account Checking'
      }
    });

    // 5. Create Payment record for Process for Payment (/store/Payment-Status)
    await prisma.refrasynthPayment.create({
      data: {
        timestamp: now,
        uniqueNo: `PAY-SEED-${100 + i + 1}`,
        partyName: item.transporterName,
        poNumber: item.poNumber,
        totalPoAmount: item.freightAmount,
        internalCode: item.indentNumber,
        product: item.productName,
        paymentTerms: 'Freight Payment',
        paymentForm: 'freight',
        numberOfDays: 0,
        payAmount: item.freightAmount,
        remark: `Freight Payment | Bilty No: ${item.billNo} | Vehicle: ${item.vehicleNo}`,
        totalPaidAmount: 0,
        outstandingAmount: item.freightAmount,
        status: 'Pending',
        status1: 'pending',
        firmNameMatch: item.firmNameMatch
      }
    });

    console.log(`✅ Seeded test item ${i + 1}/5: ${item.indentNumber} (${item.productName} - ${item.transporterName})`);
  }

  console.log('🎉 All 5 test items successfully created across all pipeline tables!');
}

seed5FreightItems()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error seeding test items:', err);
    process.exit(1);
  });
