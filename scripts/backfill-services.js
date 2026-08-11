const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const { deriveServiceStatus, calculateDelay } = require('../src/services/shared/serviceStatus.service');
const bcrypt = require('bcryptjs');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec';

function parseDate(val) {
  if (!val || String(val).trim() === '') return null;
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

function findHeaderRow(data, keyColName) {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => String(cell || '').trim().toLowerCase() === keyColName.toLowerCase())) {
      return { headerIdx: i, headers: row.map(c => String(c || '').trim()) };
    }
  }
  return { headerIdx: 0, headers: data[0] || [] };
}

async function backfillServices() {
  console.log('=== STARTING SERVICES FULL DATA BACKFILL ===\n');

  // 1. Backfill ServiceMasterDropdown
  console.log('1. Fetching Master sheet data...');
  const masterRes = await fetch(`${APPS_SCRIPT_URL}?sheet=Master`).then(r => r.json());
  let masterCount = 0;
  if (masterRes.success && masterRes.data) {
    const rows = masterRes.data.slice(1).filter(r => r && r.some(c => String(c || '').trim() !== ''));
    await prisma.serviceMasterDropdown.deleteMany({});
    const masterData = rows.map(r => ({
      department: r[0] || null,
      groupHead: r[1] || null,
      firmName: r[2] || null,
      fmsName: r[3] || null
    }));
    const res = await prisma.serviceMasterDropdown.createMany({ data: masterData });
    masterCount = res.count;
    console.log(`   Seeded ${masterCount} Master Dropdown rows.`);
  }

  // 2. Backfill ServiceOffer
  console.log('\n2. Fetching OFFER sheet data...');
  const offerRes = await fetch(`${APPS_SCRIPT_URL}?sheet=OFFER`).then(r => r.json());
  let offerCount = 0;
  if (offerRes.success && offerRes.data) {
    const { headerIdx } = findHeaderRow(offerRes.data, 'Offer No.');
    const rows = offerRes.data.slice(headerIdx + 1).filter(r => r && r.some(c => String(c || '').trim() !== ''));

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const offerNo = row[1] || `OFF-${idx + 1}`;
      const amount = parseFloat(row[6]) || 0;
      const amountPaid = parseFloat(row[9]) || 0;
      const outstanding = parseFloat(row[10]) || (amount - amountPaid);

      await prisma.serviceOffer.upsert({
        where: { offerNo },
        update: {
          firmName: row[2] || 'PMMPL',
          vendor: row[3] || 'Vendor',
          description: row[4] || null,
          location: row[5] || null,
          amount,
          isOffer: row[7] || 'Yes',
          offerCopy: row[8] || null,
          amountPaid,
          outstanding,
          status: row[11] || 'Pending'
        },
        create: {
          offerNo,
          firmName: row[2] || 'PMMPL',
          vendor: row[3] || 'Vendor',
          description: row[4] || null,
          location: row[5] || null,
          amount,
          isOffer: row[7] || 'Yes',
          offerCopy: row[8] || null,
          amountPaid,
          outstanding,
          status: row[11] || 'Pending'
        }
      });
      offerCount++;
    }
    console.log(`   Backfilled ${offerCount} ServiceOffer rows.`);
  }

  // 3. Backfill ServiceJob
  console.log('\n3. Fetching SERVICE sheet data...');
  const serviceRes = await fetch(`${APPS_SCRIPT_URL}?sheet=SERVICE`).then(r => r.json());
  let jobCount = 0;
  if (serviceRes.success && serviceRes.data) {
    const { headerIdx, headers } = findHeaderRow(serviceRes.data, 'Service No.');
    const rows = serviceRes.data.slice(headerIdx + 1).filter(r => r && r.some(c => String(c || '').trim() !== ''));

    const getVal = (row, headerNames, fallbackIdx = -1) => {
      const names = Array.isArray(headerNames) ? headerNames : [headerNames];
      for (const name of names) {
        const colIdx = headers.findIndex(h => String(h || '').trim().toLowerCase() === name.toLowerCase());
        if (colIdx >= 0 && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
          return String(row[colIdx]).trim();
        }
      }
      if (fallbackIdx >= 0 && row[fallbackIdx] !== undefined && row[fallbackIdx] !== null && String(row[fallbackIdx]).trim() !== '') {
        return String(row[fallbackIdx]).trim();
      }
      return '';
    };

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const serviceNo = row[2] || `SRV-${idx + 1}`;
      const offerNo = row[1] || null;

      let offerId = null;
      if (offerNo) {
        const matchingOffer = await prisma.serviceOffer.findUnique({ where: { offerNo } });
        if (matchingOffer) offerId = matchingOffer.id;
      }

      const planned1 = parseDate(row[11]);
      const actual1 = parseDate(row[12]);
      const delay1 = calculateDelay(planned1, actual1);

      const planned2 = parseDate(row[16]);
      const actual2 = parseDate(row[17]);
      const delay2 = calculateDelay(planned2, actual2);

      const planned3 = parseDate(getVal(row, 'Planned 3', 19));
      const actual3 = parseDate(getVal(row, 'Actual 3', 20));
      const delay3 = calculateDelay(planned3, actual3);

      const planned4 = parseDate(getVal(row, 'Planned 4', 24));
      const actual4 = parseDate(getVal(row, 'Actual 4', 25));
      const delay4 = calculateDelay(planned4, actual4);

      const planned5 = parseDate(getVal(row, 'Planned 5', 29));
      const actual5 = parseDate(getVal(row, 'Actual 5', 30));
      const delay5 = calculateDelay(planned5, actual5);

      const payload = {
        serviceNo,
        offerId,
        firmName: row[3] || 'PMMPL',
        checker: row[4] || null,
        amount: parseFloat(row[5]) || 0,
        tdsAmount: parseFloat(row[6]) || 0,
        remark: row[7] || null,
        vendor: row[8] || 'Vendor',
        description: row[9] || null,
        location: row[10] || null,
        planned1, actual1, delay1,
        billNo: getVal(row, ['Bill No.', 'Bill Number'], 14) || null,
        billCopy: getVal(row, ['Bill Copy', 'Bill Image'], 15) || null,
        planned2, actual2, delay2,
        paymentProof: getVal(row, ['Payment Proof', 'Payment Proof Url'], 19) || null,
        planned3, actual3, delay3,
        status3: getVal(row, ['Status 3', 'Status3'], 22) || null,
        remarks3: getVal(row, ['Remarks 3', 'Remarks3'], 23) || null,
        planned4, actual4, delay4,
        status4: getVal(row, ['Status 4', 'Status4'], 27) || null,
        remarks4: getVal(row, ['Remarks 4', 'Remarks4'], 28) || null,
        planned5, actual5, delay5,
        status5: getVal(row, ['Status 5', 'Status5'], 32) || null,
        remarks5: getVal(row, ['Remarks 5', 'Remarks5'], 33) || null,
        paymentForm: getVal(row, ['Payment Form', 'Payment Form Link'], 34) || null
      };

      // RECOMPUTE DERIVED STATUS FRESH
      payload.status = deriveServiceStatus(payload);

      await prisma.serviceJob.upsert({
        where: { serviceNo },
        update: payload,
        create: payload
      });
      jobCount++;
    }
    console.log(`   Backfilled ${jobCount} ServiceJob rows (all statuses recomputed fresh).`);
  }

  // 4. Backfill ServiceUtility
  console.log('\n4. Fetching UTILITY sheet data...');
  const utilRes = await fetch(`${APPS_SCRIPT_URL}?sheet=UTILITY`).then(r => r.json());
  let utilCount = 0;
  if (utilRes.success && utilRes.data) {
    const { headerIdx, headers } = findHeaderRow(utilRes.data, 'Utility No.');
    const rows = utilRes.data.slice(headerIdx + 1).filter(r => r && r.some(c => String(c || '').trim() !== ''));

    const getVal = (row, colName, fallbackVal = '') => {
      const colIdx = headers.indexOf(colName);
      return (colIdx >= 0 && row[colIdx] !== undefined && row[colIdx] !== null) ? String(row[colIdx]).trim() : fallbackVal;
    };

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const utilityNo = getVal(row, 'Utility No.') || `UT-${idx + 1}`;
      const amountVal = parseFloat(getVal(row, 'Bill Amount', 0)) || 0;
      const tdsVal = parseFloat(getVal(row, 'TDS Deduction Amount', 0)) || 0;

      const planned1 = parseDate(getVal(row, 'Planned 1'));
      const actual1 = parseDate(getVal(row, 'Actual 1'));
      const delay1 = calculateDelay(planned1, actual1);

      const planned2 = parseDate(getVal(row, 'Planned 2'));
      const actual2 = parseDate(getVal(row, 'Actual 2'));
      const delay2 = calculateDelay(planned2, actual2);

      const payload = {
        utilityNo,
        firmName: getVal(row, 'Firm Name', 'PMMPL'),
        personName: getVal(row, 'Person Name') || null,
        userName: getVal(row, 'Name Of User') || null,
        department: getVal(row, 'Department') || null,
        groupHead: getVal(row, 'Group Head') || null,
        payTo: getVal(row, 'Pay To', 'Payee'),
        amount: amountVal,
        billImage: getVal(row, 'Bill Image') || null,
        billDate: parseDate(getVal(row, 'Bill Date')),
        dueDate: parseDate(getVal(row, 'Due Date')),
        remarks: getVal(row, 'Remarks') || null,
        tdsAmount: tdsVal,
        amountPaid: parseFloat(getVal(row, 'Amount To Be Paid')) || (amountVal - tdsVal),
        outstanding: parseFloat(getVal(row, 'Outstanding Amount')) || (amountVal - tdsVal),
        status: getVal(row, 'Status', 'Pending Approval'),
        planned1, actual1, delay1,
        planned2, actual2, delay2,
        paymentFormLink: getVal(row, 'Payment Form Link') || null,
        fmsName: getVal(row, 'Fms Name') || null,
        details: getVal(row, 'Details') || null,
        approvalAttachment: getVal(row, 'Approval Attachment') || null,
        paymentNo: getVal(row, 'Payment Number') || null,
        paymentMode: getVal(row, 'Payment Mode') || null,
        transactionRef: getVal(row, 'Transaction Reference') || null,
        paymentDate: parseDate(getVal(row, 'Payment Date')),
        paymentAttachment: getVal(row, 'Payment Attachment') || null,
        paymentRemarks: getVal(row, 'Payment Remarks') || null
      };

      await prisma.serviceUtility.upsert({
        where: { utilityNo },
        update: payload,
        create: payload
      });
      utilCount++;
    }
    console.log(`   Backfilled ${utilCount} ServiceUtility rows.`);
  }

  // 5. Seed RBAC Test Users
  console.log('\n5. Seeding RBAC test users for Services module...');
  const testUsers = [
    { username: 'srv_admin', password: 'password123', name: 'Services Admin', role: 'admin', firms: 'All', page_access: 'Services_All' },
    { username: 'srv_checker', password: 'password123', name: 'Services Checker', role: 'user', firms: 'PMMPL', page_access: 'Services_Dashboard, Services_Offers, Services_Services, Services_Bills' },
    { username: 'srv_tally', password: 'password123', name: 'Tally Accountant', role: 'user', firms: 'PMMPL', page_access: 'Services_Dashboard, Services_Tally, Services_tally:audit, Services_tally:rectify, Services_tally:tally' },
    { username: 'srv_utility', password: 'password123', name: 'Utility Officer', role: 'user', firms: 'PMMPL', page_access: 'Services_Dashboard, Services_Utility, Services_utility:create, Services_utility:approval' },
    { username: 'srv_viewer', password: 'password123', name: 'Services Viewer', role: 'viewer', firms: 'All', page_access: 'Services_Dashboard, Services_Reports' }
  ];

  for (const u of testUsers) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.login.upsert({
      where: { username: u.username },
      update: {
        password: hashedPassword,
        name: u.name,
        role: u.role,
        firm_name: u.firms,
        page_access: u.page_access
      },
      create: {
        username: u.username,
        password: hashedPassword,
        name: u.name,
        role: u.role,
        firm_name: u.firms,
        page_access: u.page_access
      }
    });
  }
  console.log(`   Seeded ${testUsers.length} test users in Login table with Services_ prefixed keys.`);

  // 6. DB Summary
  console.log('\n=== BACKFILL DB SUMMARY ===');
  console.log('ServiceOffer count:', await prisma.serviceOffer.count());
  console.log('ServiceJob count:', await prisma.serviceJob.count());
  console.log('ServiceUtility count:', await prisma.serviceUtility.count());
  console.log('ServiceMasterDropdown count:', await prisma.serviceMasterDropdown.count());

  console.log('\n=== BACKFILL COMPLETED SUCCESSFULLY ===');
}

backfillServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
