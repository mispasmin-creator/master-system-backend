const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tgnyngzbukegjadygmpt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnluZ3pidWtlZ2phZHlnbXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTQwNTYsImV4cCI6MjA5NTUzMDA1Nn0.L9ri9gNKJFxanl4TS4IMj00e2y3X7AdpUds_g-zNL34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatDateForPg = (dateVal) => {
  if (!dateVal) return 'NULL';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'NULL';
  // Format as YYYY-MM-DD HH:mm:ss.SSS::timestamp
  const isoStr = d.toISOString().replace('T', ' ').replace('Z', '');
  return `'${isoStr}'::timestamp`;
};

const escapeSql = (val, colName) => {
  if (val === null || val === undefined) return 'NULL';
  if (colName === 'id') return `${parseInt(val, 10)}::int`;
  if (colName === 'created_at') return formatDateForPg(val);
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  
  // Clean raw newlines/tabs inside string values so each row stays on 1 line
  let str = String(val).replace(/[\r\n\t]+/g, ' ').trim();
  str = str.replace(/'/g, "''");
  return `'${str}'`;
};

async function generateChunkedSql() {
  console.log('Fetching master records from Supabase for chunked SQL generation...');
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
    console.error('Zero rows fetched! Aborting SQL generation.');
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

  const quotedColumns = columns.map(c => `"${c}"`).join(', ');
  const castedSelectColumns = columns.map(c => {
    if (c === 'id') return `v."id"::int`;
    if (c === 'created_at') return `v."created_at"::timestamp`;
    return `v."${c}"`;
  }).join(', ');

  let sqlLines = [];
  sqlLines.push(`-- Migration: Supabase (Store Refrasynth project) "master" table -> local Postgres "refrasynth_master"`);
  sqlLines.push(`-- Total Rows: ${allRows.length} (Chunked into blocks of 500 rows with explicit ::timestamp casts)`);
  sqlLines.push(`-- Generated At: ${new Date().toISOString()}`);
  sqlLines.push(``);
  sqlLines.push(`BEGIN;`);
  sqlLines.push(``);

  const chunkSize = 500;
  const totalChunks = Math.ceil(allRows.length / chunkSize);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkRows = allRows.slice(chunkIdx * chunkSize, (chunkIdx + 1) * chunkSize);
    const startId = chunkRows[0].id;
    const endId = chunkRows[chunkRows.length - 1].id;

    sqlLines.push(`-- Block ${chunkIdx + 1} of ${totalChunks} (Rows ${chunkIdx * chunkSize + 1} to ${chunkIdx * chunkSize + chunkRows.length}, IDs ${startId}..${endId})`);
    sqlLines.push(`INSERT INTO "refrasynth_master" (${quotedColumns})`);
    sqlLines.push(`SELECT ${castedSelectColumns}`);
    sqlLines.push(`FROM (VALUES`);

    const valueTuples = chunkRows.map((row, idx) => {
      const values = columns.map(col => escapeSql(row[col], col));
      const comma = idx === chunkRows.length - 1 ? '' : ',';
      return `  (${values.join(', ')})${comma}`;
    });

    sqlLines.push(valueTuples.join('\n'));
    sqlLines.push(`) AS v(${quotedColumns})`);
    sqlLines.push(`ON CONFLICT ("id") DO NOTHING;`);
    sqlLines.push(``);
  }

  sqlLines.push(`COMMIT;`);

  const fileContent = sqlLines.join('\n') + '\n';

  const targetDir1 = 'c:\\dev\\sql';
  const targetDir2 = 'c:\\dev\\all sql';

  if (!fs.existsSync(targetDir1)) fs.mkdirSync(targetDir1, { recursive: true });
  if (!fs.existsSync(targetDir2)) fs.mkdirSync(targetDir2, { recursive: true });

  const file1 = path.join(targetDir1, 'refrasynth_master_data.sql');
  const file2 = path.join(targetDir2, 'refrasynth_master_data.sql');

  fs.writeFileSync(file1, fileContent, 'utf8');
  fs.writeFileSync(file2, fileContent, 'utf8');

  console.log(`Successfully generated SQL chunked into ${totalChunks} query blocks for ${allRows.length} rows.`);
  console.log(`Saved to: ${file1}`);
  console.log(`Saved to: ${file2}`);
}

generateChunkedSql().catch(console.error);
