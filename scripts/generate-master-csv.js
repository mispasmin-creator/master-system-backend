const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tgnyngzbukegjadygmpt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnluZ3pidWtlZ2phZHlnbXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTQwNTYsImV4cCI6MjA5NTUzMDA1Nn0.L9ri9gNKJFxanl4TS4IMj00e2y3X7AdpUds_g-zNL34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (val instanceof Date) str = val.toISOString();
  // Check if string contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

async function generateCsv() {
  console.log('Fetching master records from Supabase for CSV generation...');
  let allRows = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('master')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      throw error;
    }

    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    console.log(`Fetched ${allRows.length} rows so far...`);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Total rows fetched: ${allRows.length}`);

  if (allRows.length === 0) {
    console.error('Zero rows fetched! Aborting CSV generation.');
    return;
  }

  const columns = [
    'id',
    'category',
    'group_name',
    'item_name',
    'department',
    'area_of_use',
    'uom',
    'firm_name',
    'fms_name',
    'payment_term',
    'default_terms',
    'where',
    'vendor_name',
    'vendor_gstin',
    'vendor_address',
    'vendor_email',
    'company_name',
    'company_address',
    'company_gstin',
    'company_phone',
    'company_pan',
    'billing_address',
    'destination_address',
    'created_at'
  ];

  let csvLines = [];
  // Header row
  csvLines.push(columns.join(','));

  for (const row of allRows) {
    const cells = columns.map(col => {
      let val = row[col];
      if (col === 'created_at' && val) {
        val = new Date(val).toISOString();
      }
      return formatCsvCell(val);
    });
    csvLines.push(cells.join(','));
  }

  const fileContent = csvLines.join('\n');

  const targetDir1 = 'c:\\dev\\sql';
  const targetDir2 = 'c:\\dev\\all sql';

  if (!fs.existsSync(targetDir1)) fs.mkdirSync(targetDir1, { recursive: true });
  if (!fs.existsSync(targetDir2)) fs.mkdirSync(targetDir2, { recursive: true });

  const file1 = path.join(targetDir1, 'refrasynth_master_data.csv');
  const file2 = path.join(targetDir2, 'refrasynth_master_data.csv');

  fs.writeFileSync(file1, fileContent, 'utf8');
  fs.writeFileSync(file2, fileContent, 'utf8');

  console.log(`Successfully generated CSV with ${allRows.length} data rows.`);
  console.log(`Saved to: ${file1}`);
  console.log(`Saved to: ${file2}`);
}

generateCsv().catch(console.error);
