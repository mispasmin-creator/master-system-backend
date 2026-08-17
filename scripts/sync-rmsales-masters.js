const { prisma } = require('../src/config/db');

async function syncMasters() {
  console.log('Starting sync from rmsales_master to rmSalesParty & rmSalesProduct...');

  try {
    const masters = await prisma.rmSalesMaster.findMany();
    console.log(`Found ${masters.length} records in rmsales_master.`);

    let partyCount = 0;
    let productCount = 0;

    for (const m of masters) {
      if (m.partyName) {
        const trimmedParty = m.partyName.trim();
        if (trimmedParty) {
          const existing = await prisma.rmSalesParty.findFirst({
            where: { name: { equals: trimmedParty, mode: 'insensitive' } }
          });
          if (!existing) {
            await prisma.rmSalesParty.create({
              data: {
                name: trimmedParty,
                firmName: m.firmName || null
              }
            });
            partyCount++;
          }
        }
      }

      if (m.productName) {
        const trimmedProduct = m.productName.trim();
        if (trimmedProduct) {
          const existing = await prisma.rmSalesProduct.findFirst({
            where: { name: { equals: trimmedProduct, mode: 'insensitive' } }
          });
          if (!existing) {
            const prod = await prisma.rmSalesProduct.create({
              data: {
                name: trimmedProduct,
                unit: 'MT',
                availableQty: 0
              }
            });

            await prisma.rmSalesInventory.upsert({
              where: { productId: prod.id },
              update: {},
              create: {
                productId: prod.id,
                availableQty: 0,
                soldQty: 0
              }
            });
            productCount++;
          }
        }
      }
    }

    console.log(`Sync completed! Added ${partyCount} new parties and ${productCount} new products.`);

    const totalParties = await prisma.rmSalesParty.count();
    const totalProducts = await prisma.rmSalesProduct.count();
    console.log(`Total rmSalesParty records: ${totalParties}`);
    console.log(`Total rmSalesProduct records: ${totalProducts}`);
  } catch (err) {
    console.error('Error during master sync:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncMasters();
