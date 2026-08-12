const { prisma } = require('../src/config/db');

async function testFlow() {
  console.log('--- E2E Flow Verification ---');
  
  // 1. Check current production_orders count before
  const countBefore = await prisma.productionOrder.count();
  console.log(`ProductionOrders count BEFORE: ${countBefore}`);

  // 2. Find an OrderReceipt that has Received Accounts completed
  let receipt = await prisma.orderReceipt.findFirst({
    where: {
      receivedAccounts: { isNot: null },
    },
    include: { checkDelivery: true, checkPo: true },
  });

  if (!receipt) {
    console.log('No existing receipt with receivedAccounts found. Creating a test OrderReceipt + OrderReceivedAccounts...');
    // Create test OrderReceipt
    receipt = await prisma.orderReceipt.create({
      data: {
        doNumber: `DO-TEST-${Date.now().toString().slice(-4)}`,
        partyPoNo: `PO-TEST-${Date.now().toString().slice(-4)}`,
        firmName: 'Test Firm',
        partyName: 'Test Party Ltd',
        productName: 'Test Product High Temp',
        quantity: 50.5,
        rateOfMaterial: 1200,
        contactPersonName: 'John Doe',
        contactPersonWhatsapp: '9876543210',
        receivedAccounts: {
          create: {},
        },
      },
      include: { checkDelivery: true, checkPo: true },
    });
  }

  console.log(`Targeting OrderReceipt ID ${receipt.id} (DO: ${receipt.doNumber}, Firm: ${receipt.firmName}, Party: ${receipt.partyName}, Product: ${receipt.productName}, Qty: ${receipt.quantity})`);

  // 3. Simulate calling POST /api/order/check-delivery/:receiptId via fetch
  const fetch = globalThis.fetch;

  // First login as admin to get token
  const loginRes = await fetch('http://localhost:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log(`Logged in as admin. Token obtained: ${token ? 'YES' : 'NO'}`);

  // 4. Submit Check Delivery with "For Production Planning"
  console.log(`Submitting Check Delivery for receipt ${receipt.id} with inStockOrNot = 'For Production Planning'...`);
  const checkDelRes = await fetch(`http://localhost:5000/api/order/check-delivery/${receipt.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      inStockOrNot: 'For Production Planning',
      productionOrderNo: `PROD-${Date.now().toString().slice(-4)}`,
      qtyTransferred: 50.5,
      batchNumberRemarks: 'Test Batch 1',
    }),
  });
  const checkDelJson = await checkDelRes.json();
  console.log('Check Delivery submission response:', checkDelJson);

  // 5. Verify GET /api/production/orders
  console.log('Fetching GET http://localhost:5000/api/production/orders...');
  const prodOrdersRes = await fetch('http://localhost:5000/api/production/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const prodOrdersJson = await prodOrdersRes.json();
  console.log(`GET /api/production/orders returned ${prodOrdersJson.data?.length || 0} rows.`);

  const newProdOrder = (prodOrdersJson.data || []).find((p) => p.receiptId === receipt.id);
  console.log('Created ProductionOrder record found:', newProdOrder);

  const countAfter = await prisma.productionOrder.count();
  console.log(`ProductionOrders count AFTER: ${countAfter}`);

  await prisma.$disconnect();
}

testFlow().catch(console.error);
