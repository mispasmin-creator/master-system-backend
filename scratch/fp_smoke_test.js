const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function smokeTest() {
  console.log('--- Starting Freight Payment Smoke Test ---');

  // 1. Login to get token
  const loginRes = await request('POST', '/users/login', { username: 'admin', password: '123' });
  console.log('Login status:', loginRes.status);
  const token = loginRes.body.token;

  // 2. Create entry
  const uniqueNo = 'FP-TEST-' + Date.now();
  const createRes = await request('POST', '/freightpayment/entry', {
    uniqueNumber: uniqueNo,
    firmName: 'Test Firm',
    transporterName: 'Express Logistics',
    plannedAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
  }, token);
  console.log('Create entry status:', createRes.status, 'ID:', createRes.body?.data?.id);
  const entryId = createRes.body.data.id;

  // 3. Complete Kitting
  const kitRes = await request('PATCH', `/freightpayment/kitting/${entryId}/complete`, { remark: 'Kitting Done' }, token);
  console.log('Complete Kitting status:', kitRes.status, 'Status:', kitRes.body?.data?.status);

  // 4. Complete Audit
  const auditRes = await request('PATCH', `/freightpayment/audit/${entryId}/complete`, { amount: 15000, remark: 'Audit Done' }, token);
  console.log('Complete Audit status:', auditRes.status, 'Status:', auditRes.body?.data?.status);

  // 5. Complete Posting
  const postRes = await request('PATCH', `/freightpayment/posting/${entryId}/complete`, { remark: 'Posting Done' }, token);
  console.log('Complete Posting status:', postRes.status, 'Status:', postRes.body?.data?.status);

  // 6. Complete Release
  const relRes = await request('PATCH', `/freightpayment/release/${entryId}/complete`, { remark: 'Release Done' }, token);
  console.log('Complete Release status:', relRes.status, 'Status:', relRes.body?.data?.status);

  // 7. Verify Entry Completed status & delay fields
  const getEntryRes = await request('GET', `/freightpayment/entry/${entryId}`, null, token);
  console.log('GET Entry status:', getEntryRes.status);
  console.log('Current Stage:', getEntryRes.body?.data?.currentStage);
  console.log('Audit Delay Days:', getEntryRes.body?.data?.auditDelayDays);

  // 8. Test Cascade Reset by completing Kitting again
  console.log('--- Testing Cascade Reset ---');
  const reKitRes = await request('PATCH', `/freightpayment/kitting/${entryId}/complete`, { remark: 'Re-Kitting Triggered' }, token);
  console.log('Re-complete Kitting status:', reKitRes.status);

  const getEntryAfterReset = await request('GET', `/freightpayment/entry/${entryId}`, null, token);
  console.log('Current Stage after Kitting re-completion:', getEntryAfterReset.body?.data?.currentStage);
  console.log('Audit Status after reset:', getEntryAfterReset.body?.data?.audit?.status);
  console.log('Posting Status after reset:', getEntryAfterReset.body?.data?.posting?.status);
  console.log('Release Status after reset:', getEntryAfterReset.body?.data?.release?.status);

  // 9. Dashboard Summary Test
  const dashRes = await request('GET', '/freightpayment/dashboard/summary', null, token);
  console.log('Dashboard Summary:', dashRes.body?.data);

  console.log('--- Freight Payment Smoke Test Complete ---');
}

smokeTest().catch(console.error);
