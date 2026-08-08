const { prisma } = require('./src/config/db');

const FOR_TRANSPORTER_BYPASS = ['FOR', 'OWNED TRUCK', 'BY COMPANY'];
const isBypassed = (m) => {
  const transporter = String(m.transporterName || m.transporter || '').trim().toUpperCase();
  if (FOR_TRANSPORTER_BYPASS.includes(transporter)) return true;
  const firm = String(m.firmName || m.lift?.firmName || '').trim().toUpperCase();
  if ((firm === 'RKL' || firm === 'PURAB') && transporter === 'FOR') return true;
  if ((firm === 'PMMPL' || firm === 'PMPL') && (transporter === 'EX FACTORY TRANSPORTER' || transporter === 'EX FACTORY')) return true;
  return false;
};

async function testAudit() {
  const mismatches = await prisma.purchaseMismatch.findMany();
  const mismatchedLiftIds = new Set(mismatches.filter((m) => m.liftId != null).map((m) => m.liftId));
  
  const untrackedLifts = await prisma.purchaseLift.findMany({
    where: { id: { notIn: Array.from(mismatchedLiftIds) } },
    include: { 
      fullkitting: true,
      receipt: true,
      lab: true,
      bilty: true,
    },
  });
  
  console.log(`Found ${untrackedLifts.length} untracked lifts`);
  let pushed = 0;
  for (const l of untrackedLifts) {
    if (!l.receipt) {
      console.log(`Lift ${l.id} failed receipt check`);
      continue;
    }
    if (l.receipt.unloadApprovalRequired === 'Yes' && !l.receipt.unloadApprovalStatus) {
      console.log(`Lift ${l.id} failed unload check`);
      continue;
    }
    if (!l.lab) {
      console.log(`Lift ${l.id} failed lab check`);
      continue;
    }
    
    const isBiltyDone = Boolean(l.bilty) || isBypassed({ transporterName: l.transporterName, firmName: l.firmName });
    if (isBiltyDone) {
      console.log(`Lift ${l.id} PUSHED!`);
      pushed++;
    } else {
      console.log(`Lift ${l.id} failed bilty check`);
    }
  }
  console.log(`Total pushed: ${pushed}`);
}

testAudit().catch(console.error).finally(() => prisma.$disconnect());
