const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = 'https://tpdsnomwjuzgzvyxehpc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZHNub213anV6Z3p2eXhlaHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjk0NjcsImV4cCI6MjA5NDc0NTQ2N30.1KQAYw6D0HU-HihpXtbsIDcsyM347pa3XMFyXCfzclQ';

const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = new PrismaClient();

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const parseFloatOrNull = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

const isDone = (val) => {
  const n = String(val || '').trim().toLowerCase();
  return n === 'done' || n === 'completed';
};

async function fetchAll(table) {
  let allRows = [];
  let from = 0;
  const step = 1000;
  let fetching = true;

  while (fetching) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + step - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += step;
      if (data.length < step) fetching = false;
    } else {
      fetching = false;
    }
  }
  return allRows;
}

async function runFullMigration() {
  console.log('--- Starting Complete Freight Payment Migration ---');

  const accountCheckingRows = await fetchAll('AccountChecking');
  const accountAuditRows = await fetchAll('AccountAudit');
  const postingRows = await fetchAll('Posting');
  const freightPaymentRows = await fetchAll('FreightPayment');

  console.log(`Fetched:
- AccountChecking: ${accountCheckingRows.length} rows
- AccountAudit: ${accountAuditRows.length} rows
- Posting: ${postingRows.length} rows
- FreightPayment: ${freightPaymentRows.length} rows`);

  // Map to index audit, posting, freight rows by Unique Number
  const auditMap = new Map();
  accountAuditRows.forEach((r) => {
    if (r['Unique Number']) auditMap.set(String(r['Unique Number']).trim().toLowerCase(), r);
  });

  const postingMap = new Map();
  postingRows.forEach((r) => {
    if (r['Unique Number']) postingMap.set(String(r['Unique Number']).trim().toLowerCase(), r);
  });

  const freightMap = new Map();
  freightPaymentRows.forEach((r) => {
    if (r['Unique Number']) freightMap.set(String(r['Unique Number']).trim().toLowerCase(), r);
  });

  let entryCount = 0;
  let kittingCount = 0;
  let auditCount = 0;
  let postingCount = 0;
  let releaseCount = 0;

  for (const ac of accountCheckingRows) {
    const uniqueNumber = String(ac['Unique Number'] || ac['Payment Number'] || `AC-${ac.id}`).trim();
    const key = uniqueNumber.toLowerCase();

    const auditMatch = auditMap.get(key);
    const postingMatch = postingMap.get(key);
    const freightMatch = freightMap.get(key);

    const plannedAt = parseDate(ac.Timestamp) || parseDate(ac.created_at);
    const actualAt = parseDate(ac.created_at);

    // Upsert Entry
    const entry = await prisma.freightPaymentEntry.upsert({
      where: { uniqueNumber },
      update: {
        paymentNumber: ac['Payment Number'] ? String(ac['Payment Number']) : null,
        firmName: ac['Firm Name'] ? String(ac['Firm Name']) : null,
        fmsName: ac['Fms Name'] ? String(ac['Fms Name']) : null,
        transporterName: ac['Transporter Name'] ? String(ac['Transporter Name']) : null,
        vehicleNumber: ac['Vehicle Number'] ? String(ac['Vehicle Number']) : null,
        fromLocation: ac.From ? String(ac.From) : null,
        toLocation: ac.To ? String(ac.To) : null,
        materialLoadDetails: ac['Material Load Details'] ? String(ac['Material Load Details']) : null,
        biltyNumber: ac['Bilty Number'] ? String(ac['Bilty Number']) : null,
        rateType: ac['Rate Type'] ? String(ac['Rate Type']) : null,
        amount: parseFloatOrNull(ac.Amount),
        biltyImageUrl: ac['Bilty Image'] ? String(ac['Bilty Image']) : null,
        liftId: ac['Lift ID'] ? String(ac['Lift ID']) : null,
        partyName: ac['Party Name'] ? String(ac['Party Name']) : null,
        billingQty: parseFloatOrNull(ac['Billing Qty']),
        billNumber: ac['Bill Number'] ? String(ac['Bill Number']) : null,
        batchNumber: ac['Batch Number'] ? String(ac['Batch Number']) : null,
        plannedAt,
        actualAt,
        remark: ac.Remark ? String(ac.Remark) : null,
      },
      create: {
        uniqueNumber,
        paymentNumber: ac['Payment Number'] ? String(ac['Payment Number']) : null,
        firmName: ac['Firm Name'] ? String(ac['Firm Name']) : null,
        fmsName: ac['Fms Name'] ? String(ac['Fms Name']) : null,
        transporterName: ac['Transporter Name'] ? String(ac['Transporter Name']) : null,
        vehicleNumber: ac['Vehicle Number'] ? String(ac['Vehicle Number']) : null,
        fromLocation: ac.From ? String(ac.From) : null,
        toLocation: ac.To ? String(ac.To) : null,
        materialLoadDetails: ac['Material Load Details'] ? String(ac['Material Load Details']) : null,
        biltyNumber: ac['Bilty Number'] ? String(ac['Bilty Number']) : null,
        rateType: ac['Rate Type'] ? String(ac['Rate Type']) : null,
        amount: parseFloatOrNull(ac.Amount),
        biltyImageUrl: ac['Bilty Image'] ? String(ac['Bilty Image']) : null,
        liftId: ac['Lift ID'] ? String(ac['Lift ID']) : null,
        partyName: ac['Party Name'] ? String(ac['Party Name']) : null,
        billingQty: parseFloatOrNull(ac['Billing Qty']),
        billNumber: ac['Bill Number'] ? String(ac['Bill Number']) : null,
        batchNumber: ac['Batch Number'] ? String(ac['Batch Number']) : null,
        plannedAt,
        actualAt,
        remark: ac.Remark ? String(ac.Remark) : null,
      },
    });

    entryCount += 1;

    // 1. Kitting stage: Default Done since row is in AccountChecking
    const kittingStatus = isDone(ac.Status) || ac.created_at ? 'Done' : 'Not Done';
    await prisma.freightPaymentKitting.upsert({
      where: { entryId: entry.id },
      update: {
        status: kittingStatus,
        remark: ac.Remark ? String(ac.Remark) : null,
        actualAt: parseDate(ac.created_at),
        nextPlannedAt: parseDate(ac.created_at),
      },
      create: {
        entryId: entry.id,
        status: kittingStatus,
        remark: ac.Remark ? String(ac.Remark) : null,
        actualAt: parseDate(ac.created_at),
        nextPlannedAt: parseDate(ac.created_at),
      },
    });
    kittingCount += 1;

    // 2. Audit stage: match AccountAudit row if present
    if (auditMatch) {
      await prisma.freightPaymentAudit.upsert({
        where: { entryId: entry.id },
        update: {
          status: isDone(auditMatch.Status) ? 'Done' : 'Not Done',
          amount: parseFloatOrNull(auditMatch.Amount),
          remark: auditMatch.Remark ? String(auditMatch.Remark) : null,
          auditImageUrl: auditMatch['Audit Image'] ? String(auditMatch['Audit Image']) : null,
          batchNumber: auditMatch['Batch Number'] ? String(auditMatch['Batch Number']) : null,
          actualAt: parseDate(auditMatch.created_at),
        },
        create: {
          entryId: entry.id,
          status: isDone(auditMatch.Status) ? 'Done' : 'Not Done',
          amount: parseFloatOrNull(auditMatch.Amount),
          remark: auditMatch.Remark ? String(auditMatch.Remark) : null,
          auditImageUrl: auditMatch['Audit Image'] ? String(auditMatch['Audit Image']) : null,
          batchNumber: auditMatch['Batch Number'] ? String(auditMatch['Batch Number']) : null,
          actualAt: parseDate(auditMatch.created_at),
        },
      });
      auditCount += 1;
    }

    // 3. Posting stage: match Posting row if present
    if (postingMatch) {
      await prisma.freightPaymentPosting.upsert({
        where: { entryId: entry.id },
        update: {
          status: isDone(postingMatch.Status) ? 'Done' : 'Not Done',
          remark: postingMatch.Remark ? String(postingMatch.Remark) : null,
          batchNumber: postingMatch['Batch Number'] ? String(postingMatch['Batch Number']) : null,
          actualAt: parseDate(postingMatch.created_at),
        },
        create: {
          entryId: entry.id,
          status: isDone(postingMatch.Status) ? 'Done' : 'Not Done',
          remark: postingMatch.Remark ? String(postingMatch.Remark) : null,
          batchNumber: postingMatch['Batch Number'] ? String(postingMatch['Batch Number']) : null,
          actualAt: parseDate(postingMatch.created_at),
        },
      });
      postingCount += 1;
    }

    // 4. Release stage: match FreightPayment row if present
    if (freightMatch) {
      await prisma.freightPaymentRelease.upsert({
        where: { entryId: entry.id },
        update: {
          status: isDone(freightMatch.Status) ? 'Done' : 'Not Done',
          remark: freightMatch.Remark ? String(freightMatch.Remark) : null,
          batchNumber: freightMatch['Batch Number'] ? String(freightMatch['Batch Number']) : null,
          actualAt: parseDate(freightMatch.created_at),
        },
        create: {
          entryId: entry.id,
          status: isDone(freightMatch.Status) ? 'Done' : 'Not Done',
          remark: freightMatch.Remark ? String(freightMatch.Remark) : null,
          batchNumber: freightMatch['Batch Number'] ? String(freightMatch['Batch Number']) : null,
          actualAt: parseDate(freightMatch.created_at),
        },
      });
      releaseCount += 1;
    }
  }

  console.log(`--- Migration Final Summary ---`);
  console.log(`Entries Created/Updated: ${entryCount}`);
  console.log(`Kitting Stages: ${kittingCount}`);
  console.log(`Audit Stages: ${auditCount}`);
  console.log(`Posting Stages: ${postingCount}`);
  console.log(`Release Stages: ${releaseCount}`);
}

runFullMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
