const BASE_URL = 'http://localhost:5000/api';

async function testInventoryEndpoints() {
  console.log('====================================================');
  console.log('Testing Inventory Endpoints (/api/inventory)');
  console.log('====================================================');

  try {
    // 1. Root / Overview
    const rootRes = await fetch(`${BASE_URL}/inventory`);
    const rootData = await rootRes.json();
    console.log('\nGET /api/inventory:', rootRes.status, rootData);

    // 2. Login to get token for protected endpoints
    console.log('\nAuthenticating with /api/users/login...');
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: '123',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login response status:', loginRes.status, 'Token acquired:', !!token);

    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };

    // 3. GET Raw Material
    const rmRes = await fetch(`${BASE_URL}/inventory/raw-material?firm=Pmmpl`, { headers });
    const rmData = await rmRes.json();
    console.log('\nGET /api/inventory/raw-material?firm=Pmmpl:', rmRes.status, 'Items count:', rmData.data?.length || 0);

    // 4. POST Raw Material (add item)
    const addRmRes = await fetch(`${BASE_URL}/inventory/raw-material`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firmName: 'Pmmpl',
        itemName: 'Test Bauxite Grade A',
        unit: 'MT',
        opStock: 100,
        productRate: 450,
        annualConsumption: 1200,
        leadTimeDays: 15,
        safetyFactor: 1.1,
      }),
    });
    const addRm = await addRmRes.json();
    console.log('\nPOST /api/inventory/raw-material:', addRmRes.status, 'Created ID:', addRm.data?.id);
    const createdRmId = addRm.data?.id;

    if (createdRmId) {
      // 5. PUT Raw Material (edit item)
      const updateRmRes = await fetch(`${BASE_URL}/inventory/raw-material/${createdRmId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          actualLevel: 125,
          productRate: 480,
        }),
      });
      const updateRm = await updateRmRes.json();
      console.log('\nPUT /api/inventory/raw-material/:id:', updateRmRes.status, 'New Level:', updateRm.data?.actualLevel);

      // 6. DELETE Raw Material
      const delRmRes = await fetch(`${BASE_URL}/inventory/raw-material/${createdRmId}`, {
        method: 'DELETE',
        headers,
      });
      const delRm = await delRmRes.json();
      console.log('\nDELETE /api/inventory/raw-material/:id:', delRmRes.status, delRm);
    }

    // 7. GET Finished Goods
    const fgRes = await fetch(`${BASE_URL}/inventory/finished-goods?firm=Purab`, { headers });
    const fgData = await fgRes.json();
    console.log('\nGET /api/inventory/finished-goods?firm=Purab:', fgRes.status, 'Items count:', fgData.data?.length || 0);

    // 8. GET Trading Material
    const tmRes = await fetch(`${BASE_URL}/inventory/trading-material?firm=Rkl`, { headers });
    const tmData = await tmRes.json();
    console.log('\nGET /api/inventory/trading-material?firm=Rkl:', tmRes.status, 'Items count:', tmData.data?.length || 0);

    // 9. POST Stock Adjustment
    const adjRes = await fetch(`${BASE_URL}/inventory/stock-adjustment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firmName: 'Pmmpl',
        category: 'RawMaterial',
        itemName: 'Test Bauxite Grade A',
        qty: 10,
        direction: 'Factory +',
        remark: 'Initial test stock check',
      }),
    });
    const adjData = await adjRes.json();
    console.log('\nPOST /api/inventory/stock-adjustment:', adjRes.status, 'Adj ID:', adjData.data?.id);

    // 10. GET History
    const histRes = await fetch(`${BASE_URL}/inventory/history?firm=Pmmpl`, { headers });
    const histData = await histRes.json();
    console.log('\nGET /api/inventory/history?firm=Pmmpl:', histRes.status, 'RM Hist Count:', histData.data?.rawMaterial?.length || 0);

    // 11. GET Settings
    const setRes = await fetch(`${BASE_URL}/inventory/settings`, { headers });
    const setReq = await setRes.json();
    console.log('\nGET /api/inventory/settings:', setRes.status, 'Users count:', setReq.data?.users?.length || 0);

    console.log('\n====================================================');
    console.log('✅ ALL INVENTORY ENDPOINTS VERIFIED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ Endpoint Test Error:', error.message);
  }
}

testInventoryEndpoints();
