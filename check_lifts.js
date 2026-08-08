const { prisma } = require('./src/config/db');

async function checkLifts() {
  const lifts = await prisma.purchaseLift.findMany({
    include: {
      receipt: true,
      lab: true,
      bilty: true,
      fullkitting: true,
      mismatches: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  for (const l of lifts) {
    if (l.bilty) {
      console.log(`Lift ${l.liftNo} (${l.id}):`);
      console.log(`  - Receipt: ${!!l.receipt}`);
      if (l.receipt) {
        console.log(`  - UnloadApprovalRequired: ${l.receipt.unloadApprovalRequired}`);
        console.log(`  - UnloadApprovalStatus: ${l.receipt.unloadApprovalStatus}`);
      }
      console.log(`  - Lab: ${!!l.lab}`);
      console.log(`  - Bilty: ${!!l.bilty}`);
      console.log(`  - Mismatches: ${l.mismatches.length}`);
      
      const requiresUnload = l.receipt?.unloadApprovalRequired === 'Yes';
      const unloadDone = l.receipt?.unloadApprovalStatus != null && l.receipt?.unloadApprovalStatus !== '';
      
      let isReadyForAudit = false;
      if (l.receipt) {
         if (requiresUnload && !unloadDone) {
            console.log('  -> Blocked by Unload Approval');
         } else if (!l.lab) {
            console.log('  -> Blocked by Lab');
         } else {
            isReadyForAudit = true;
         }
      } else {
         console.log('  -> Blocked by Receipt');
      }
      
      console.log(`  -> isReadyForAudit: ${isReadyForAudit}`);
      console.log('---');
    }
  }
}

checkLifts().catch(console.error).finally(() => prisma.$disconnect());
