const { uploadServiceFile } = require('../src/services/shared/fileUpload.service');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log('=== TESTING SERVICES FILE UPLOAD SERVICE ===\n');

  const dummyContent = 'Dummy invoice test attachment content for Services module';
  const buffer = Buffer.from(dummyContent, 'utf8');

  const result = await uploadServiceFile(buffer, 'test_invoice.pdf', 'application/pdf', 'http://localhost:5000');
  console.log('Uploaded File Result:');
  console.log('  Filename:', result.filename);
  console.log('  Path:', result.path);
  console.log('  URL:', result.url);

  // Check physical file existence
  const physicalPath = path.join(__dirname, '../uploads', result.filename);
  const exists = fs.existsSync(physicalPath);
  console.log('  Physical file exists on disk:', exists ? 'PASS ✅' : 'FAIL ❌');

  // Clean up
  if (exists) fs.unlinkSync(physicalPath);

  console.log('\n=== FILE UPLOAD SERVICE TEST COMPLETED ===');
}

testUpload().catch(console.error);
