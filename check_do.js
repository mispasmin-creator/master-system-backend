const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.orderReceipt.findMany({
    where: {
      doNumber: {
        in: ['DO-330', 'DO-331', 'DO-298', 'DO-299', 'DO-295', '330', '331', '298', '299', '295']
      }
    }
  });
  console.log("order_receipt:", receipts.map(r => r.doNumber));

  const deliveries = await prisma.orderDelivery.findMany({
    where: {
      doNumber: {
        in: ['DO-330', 'DO-331', 'DO-298', 'DO-299', 'DO-295', '330', '331', '298', '299', '295']
      }
    }
  });
  console.log("order_delivery:", deliveries.map(d => d.doNumber));
  
  // also get all DO numbers just to see if we're matching the format correctly
  const allReceipts = await prisma.orderReceipt.findMany({
    take: 5,
    select: { doNumber: true }
  });
  console.log("sample do numbers:", allReceipts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
