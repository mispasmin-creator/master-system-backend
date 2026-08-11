const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;

/**
 * Parses SQL INSERT statements (including multi-line) from a SQL dump file into JS objects.
 */
function parseSqlInserts(sqlText, tableName) {
  const regex = new RegExp(`INSERT INTO ${tableName}\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\(([^;]+)\\);`, 'gi');
  const rows = [];
  let match;

  while ((match = regex.exec(sqlText)) !== null) {
    const colNames = match[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const valString = match[2];
    
    const values = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < valString.length; i++) {
      const char = valString[i];
      if (char === "'" && (i === 0 || valString[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(cleanSqlValue(currentVal.trim()));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(cleanSqlValue(currentVal.trim()));

    const rowObj = {};
    colNames.forEach((col, index) => {
      rowObj[col] = values[index];
    });
    rows.push(rowObj);
  }

  return rows;
}

function cleanSqlValue(val) {
  if (!val || val.toUpperCase() === 'NULL') return null;
  let str = val.trim();
  if (str.startsWith("'") && str.endsWith("'")) {
    str = str.slice(1, -1).replace(/''/g, "'").replace(/\\'/g, "'");
    return str;
  }
  if (!isNaN(str)) return Number(str);
  return str;
}

async function runBackfill(sourceFilePath) {
  console.log('=== STARTING PAYMENT MODULE DATA BACKFILL ===\n');

  let sqlContent = '';
  if (sourceFilePath && fs.existsSync(sourceFilePath)) {
    console.log(`Reading SQL source data from: ${sourceFilePath}`);
    sqlContent = fs.readFileSync(sourceFilePath, 'utf8');
  } else {
    const defaultSchemaPath = path.join(__dirname, '../../Make-payment-Application-/supabase_schema.sql');
    console.log(`Reading fallback SQL data from: ${defaultSchemaPath}`);
    sqlContent = fs.readFileSync(defaultSchemaPath, 'utf8');
  }

  // Parse legacy tables in order of precedence
  const creationRows = parseSqlInserts(sqlContent, 'payment_creation');
  const fundingRows = parseSqlInserts(sqlContent, 'channel_funding');
  const approvalRows = parseSqlInserts(sqlContent, 'payment_approval');
  const postingRows = parseSqlInserts(sqlContent, 'posting');
  const disburseRows = parseSqlInserts(sqlContent, 'make_final_payment');

  console.log(`Extracted row counts from source SQL dump:`);
  console.log(`  - payment_creation: ${creationRows.length}`);
  console.log(`  - channel_funding: ${fundingRows.length}`);
  console.log(`  - payment_approval: ${approvalRows.length}`);
  console.log(`  - posting: ${postingRows.length}`);
  console.log(`  - make_final_payment: ${disburseRows.length}`);

  // Merge into a map keyed by Payment Number (most advanced stage wins)
  const mergedPayments = new Map();

  const processStageRows = (rows, stageName) => {
    for (const r of rows) {
      const pNum = r["Payment Number"];
      if (!pNum) continue;

      const existing = mergedPayments.get(pNum) || {};
      mergedPayments.set(pNum, {
        ...existing,
        ...r,
        _mostAdvancedStage: stageName
      });
    }
  };

  processStageRows(creationRows, 'payment_creation');
  processStageRows(fundingRows, 'channel_funding');
  processStageRows(approvalRows, 'payment_approval');
  processStageRows(postingRows, 'posting');
  processStageRows(disburseRows, 'make_final_payment');

  console.log(`\nMerged ${mergedPayments.size} unique payment requisitions.\n`);

  let importedRequestsCount = 0;
  let importedHistoryCount = 0;

  for (const [pNum, row] of mergedPayments.entries()) {
    // Determine status
    let status = row["Status"] || 'Submitted';
    if (row._mostAdvancedStage === 'make_final_payment' && status === 'Submitted') {
      status = 'Payment Completed';
    }

    const payload = {
      paymentNumber: pNum,
      uniqueNumber: row["Unique Number"] || null,
      status: status,
      fmsName: row["FMS Name"] || 'Repair FMS',
      firmName: row["Firm Name"] || 'PMMPL',
      payTo: row["Pay To"] || 'Unknown Payee',
      amount: row["Amount"] !== null && row["Amount"] !== undefined ? Number(row["Amount"]) : 0,
      remarks: row["Remarks"] || null,
      attachmentUrl: row["Attachment URL"] || null,
      maker: row["Maker"] || row["Created By"] || 'Maker',
      checker: row["Checker"] || null,
      approver: row["Approver"] || null,
      typeOfFunding: row["Type of funding"] || null,
      fundingRemarks: row["Funding Remarks"] || null,
      approverRemarks: row["Approver Remarks"] || null,
      postingRemarks: row["Remarks 2"] || row["Posting Remarks"] || null,
      paymentMode: row["Payment Mode"] || null,
      financeRemarks: row["Finance Remarks"] || null,
      plannedDate: row["Planned Date"] || null,
      actualDate: row["Actual Date"] || null,
      delayDays: row["Delay Days"] ? Number(row["Delay Days"]) : 0,
      department: row["Department"] || null,
      priority: row["Priority"] || 'Medium',
      requiredDate: row["Required Date"] || null,
      supportingDocuments: row["Supporting Documents"] || null,
      createdBy: row["Created By"] || 'system_backfill'
    };

    // Upsert into PaymentRequest
    const req = await prisma.paymentRequest.upsert({
      where: { paymentNumber: pNum },
      update: payload,
      create: payload
    });
    importedRequestsCount++;

    // Parse Approval History JSON column
    const historyJsonRaw = row["Approval History"];
    if (historyJsonRaw) {
      try {
        let historyArray = [];
        if (typeof historyJsonRaw === 'string') {
          historyArray = JSON.parse(historyJsonRaw);
        } else if (Array.isArray(historyJsonRaw)) {
          historyArray = historyJsonRaw;
        }

        if (Array.isArray(historyArray)) {
          for (const item of historyArray) {
            const rawUser = item.user || item.User || 'System';
            let uName = rawUser;
            let uRole = 'User';

            const userRoleMatch = rawUser.match(/^(.+?)\s*\((.+?)\)$/);
            if (userRoleMatch) {
              uName = userRoleMatch[1].trim();
              uRole = userRoleMatch[2].trim();
            }

            await prisma.paymentHistoryEntry.create({
              data: {
                paymentId: req.id,
                title: item.title || item.Title || 'Status Update',
                userName: uName,
                userRole: uRole,
                comment: item.comment || item.Comment || item.remarks || null,
                createdAt: item.timestamp || item.Timestamp ? new Date(item.timestamp || item.Timestamp) : new Date()
              }
            });
            importedHistoryCount++;
          }
        }
      } catch (err) {
        console.warn(`Could not parse Approval History JSON for ${pNum}:`, err.message);
      }
    }
  }

  // Count master rows
  const vendorCount = await prisma.paymentVendor.count();
  const fmsMasterCount = await prisma.paymentFmsMaster.count();
  const reqCount = await prisma.paymentRequest.count();
  const histCount = await prisma.paymentHistoryEntry.count();

  console.log('=== BACKFILL VERIFICATION SUMMARY ===');
  console.log(`PaymentRequest rows in DB:      ${reqCount}`);
  console.log(`PaymentHistoryEntry rows in DB: ${histCount}`);
  console.log(`PaymentVendor rows in DB:       ${vendorCount}`);
  console.log(`PaymentFmsMaster rows in DB:     ${fmsMasterCount}`);
  console.log('=====================================\n');

  return {
    creationSourceCount: creationRows.length,
    fundingSourceCount: fundingRows.length,
    approvalSourceCount: approvalRows.length,
    postingSourceCount: postingRows.length,
    disburseSourceCount: disburseRows.length,
    mergedUniqueCount: mergedPayments.size,
    reqCount,
    histCount,
    vendorCount,
    fmsMasterCount
  };
}

const customSource = process.argv[2];
runBackfill(customSource)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
