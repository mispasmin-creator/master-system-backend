const http = require('http');
const fs = require('fs');

http.get('http://localhost:5000/api/purchase/accounts-audit/data', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('api_response.json', data);
    console.log('Saved to api_response.json');
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
