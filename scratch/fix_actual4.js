const { prisma } = require('../src/config/db');

async function fixActual4() {
  try {
    const indents = await prisma.refrasynthIndent.findMany({
      where: {
        poRequired: 'Yes',
        OR: [
          { poNumber: null },
          { poNumber: '' }
        ]
      }
    });

    console.log(`Found ${indents.length} indents requiring PO but having no PO Number.`);

    let count = 0;
    for (const item of indents) {
      if (item.actual4 && item.actual4 !== '') {
        await prisma.refrasynthIndent.update({
          where: { id: item.id },
          data: { actual4: '' }
        });
        count++;
        console.log(`Cleared actual4 for Indent ID ${item.id} (${item.indentNumber}).`);
      }
    }

    console.log(`Successfully reset actual4 for ${count} indents.`);
  } catch (err) {
    console.error('Error fixing actual4:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixActual4();
