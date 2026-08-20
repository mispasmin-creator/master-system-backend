const { prisma } = require('../src/config/db');

async function seedTestData() {
  console.log('Seeding clearly labeled test dummy data for Production workflow...');

  const testOrders = [
    {
      deliveryOrderNo: 'TEST-DO-101',
      firmName: 'Passary Minerals',
      partyName: 'TEST - Acme Refractories Ltd',
      productName: 'TEST - High Alumina Brick A',
      orderQuantity: 500,
      productRate: 12500,
      priority: 'High',
      compositionNo: 'TEST-COMP-101',
      variableCost: 8200,
      manufacturingCost: 1500,
      gpPercent: 22.4,
      aluminaPercent: 70,
      ironPercent: 1.5,
      bdPercent: 2.8,
      apPercent: 18,
      materials: [
        { materialName: 'TEST - Calcined Bauxite', quantity: 60, sequence: 1 },
        { materialName: 'TEST - Raw Clay', quantity: 40, sequence: 2 },
      ],
    },
    {
      deliveryOrderNo: 'TEST-DO-102',
      firmName: 'Passary Minerals',
      partyName: 'TEST - Global Steel Corp',
      productName: 'TEST - Castable Mix B',
      orderQuantity: 250,
      productRate: 18000,
      priority: 'Medium',
      compositionNo: 'TEST-COMP-102',
      variableCost: 11000,
      manufacturingCost: 2200,
      gpPercent: 26.6,
      aluminaPercent: 85,
      ironPercent: 0.9,
      bdPercent: 3.1,
      apPercent: 15,
      materials: [
        { materialName: 'TEST - Tabular Alumina', quantity: 70, sequence: 1 },
        { materialName: 'TEST - Calcium Aluminate Cement', quantity: 30, sequence: 2 },
      ],
    },
  ];

  for (const item of testOrders) {
    let order = await prisma.productionOrder.findFirst({
      where: { deliveryOrderNo: item.deliveryOrderNo },
    });

    if (!order) {
      order = await prisma.productionOrder.create({
        data: {
          deliveryOrderNo: item.deliveryOrderNo,
          firmName: item.firmName,
          partyName: item.partyName,
          productName: item.productName,
          orderQuantity: item.orderQuantity,
          productRate: item.productRate,
          priority: item.priority,
          status: 'Pending',
        },
      });
      console.log(`Created test order: ${order.deliveryOrderNo} (${order.id})`);
    } else {
      console.log(`Test order already exists: ${order.deliveryOrderNo} (${order.id})`);
    }

    let costing = await prisma.productionCosting.findFirst({
      where: { orderId: order.id, compositionNo: item.compositionNo },
    });

    if (!costing) {
      costing = await prisma.productionCosting.create({
        data: {
          orderId: order.id,
          compositionNo: item.compositionNo,
          variableCost: item.variableCost,
          manufacturingCost: item.manufacturingCost,
          sellingPrice: item.productRate,
          gpPercent: item.gpPercent,
          aluminaPercent: item.aluminaPercent,
          ironPercent: item.ironPercent,
          bdPercent: item.bdPercent,
          apPercent: item.apPercent,
          status: null, // Initial pending state for PI Approval
          materials: {
            create: item.materials,
          },
        },
      });
      console.log(`Created test costing: ${costing.compositionNo} (${costing.id})`);
    } else {
      console.log(`Test costing already exists: ${costing.compositionNo} (${costing.id})`);
    }
  }

  console.log('Dummy test data seeded successfully.');
}

seedTestData()
  .catch((e) => {
    console.error('Error seeding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
