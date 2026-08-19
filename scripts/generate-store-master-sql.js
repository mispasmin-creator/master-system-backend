const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tgnyngzbukegjadygmpt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GCh-WQ9gPB3P6oLAwxUbbg_E2dSwJvM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatDateForPg = (dateVal) => {
  if (!dateVal) return 'NULL';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'NULL';
  const isoStr = d.toISOString().replace('T', ' ').replace('Z', '');
  return `'${isoStr}'::timestamp`;
};

const escapeSql = (val, colName) => {
  if (val === null || val === undefined) return 'NULL';
  if (colName === 'id') return `${parseInt(val, 10)}::int`;
  if (colName === 'created_at') return formatDateForPg(val);
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';

  let str = String(val).replace(/[\r\n\t]+/g, ' ').trim();
  str = str.replace(/'/g, "''");
  return `'${str}'`;
};

async function generateChunkedSql() {
  console.log('Fetching master records from the Store-Refrasynth reference Supabase project...');
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
  sqlLines.push(`-- Migration: Supabase (Store Refrasynth reference project) "master" table -> local Postgres "store_master"`);
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
    sqlLines.push(`INSERT INTO "store_master" (${quotedColumns})`);
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

  sqlLines.push(`-- Keep the id sequence ahead of the highest imported id so future inserts don't collide`);
  sqlLines.push(`SELECT setval(pg_get_serial_sequence('store_master', 'id'), (SELECT MAX(id) FROM "store_master"));`);
  sqlLines.push(``);
  sqlLines.push(`COMMIT;`);

  const fileContent = sqlLines.join('\n') + '\n';

  const targetDir = 'c:\\Users\\ASUS\\Downloads\\Passary\\Passary Merge System\\All SQl Query';
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const outFile = path.join(targetDir, 'store master details.sql');
  fs.writeFileSync(outFile, fileContent, 'utf8');

  console.log(`Successfully generated SQL chunked into ${totalChunks} query blocks for ${allRows.length} rows.`);
  console.log(`Saved to: ${outFile}`);
}

generateChunkedSql().catch(console.error);
