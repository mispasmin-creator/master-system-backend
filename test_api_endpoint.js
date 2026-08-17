const jwt = require('jsonwebtoken');

const JWT_SECRET = '8377b52036aceff2b4c435372b509dcfe44b9f7ff75d1a7abff738831f8d5a3c';

async function testEndpoint() {
  const token = jwt.sign(
    { id: 1, username: 'admin', role: 'admin', firm_name: 'Refrasynth' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Testing GET http://localhost:5000/api/refrasynth/master ...');
  try {
    const res = await fetch('http://localhost:5000/api/refrasynth/master', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Status code:', res.status);
    const json = await res.json();
    console.log('Success:', json.success);
    console.log('Data rows count returned by API:', json.data ? json.data.length : 'none');
    if (json.data && json.data.length > 0) {
      console.log('First 2 rows from API:');
      console.log(JSON.stringify(json.data.slice(0, 2), null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testEndpoint();
