const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { prisma } = require('../src/config/db');

async function run() {
  console.log('Starting migration and transport of masters data...');

  try {
    // 1. Create the table in local Postgres (pgAdmin) if it doesn't exist
    // Additive changes only: safe defaults, no drop or alter.
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS "rmsales_master" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "firm_name" TEXT,
        "party_name" TEXT,
        "product_name" TEXT,
        "transport_type" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3),
        CONSTRAINT "rmsales_master_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log('Ensuring rmsales_master table exists locally...');
    await prisma.$executeRawUnsafe(createTableSql);
    console.log('rmsales_master table checked/created successfully.');

    // 2. Read the exported data from the steps output file
    const stepOutputPath = 'C:\\Users\\rudra\\.gemini\\antigravity-ide\\brain\\3b79cb09-f409-4bb6-b33c-5091121fa3d1\\.system_generated\\steps\\59\\output.txt';
    console.log(`Reading source data from ${stepOutputPath}...`);
    
    if (!fs.existsSync(stepOutputPath)) {
      throw new Error(`Step output file not found at ${stepOutputPath}`);
    }

    const fileContent = fs.readFileSync(stepOutputPath, 'utf8');
    const responseJson = JSON.parse(fileContent);
    const resultText = responseJson.result;

    // Extract the JSON content between brackets
    const jsonStart = resultText.indexOf('[');
    const jsonEnd = resultText.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Could not find JSON array brackets in output file');
    }

    const rawJsonArrayText = resultText.slice(jsonStart, jsonEnd).trim();
    console.log('rawJsonArrayText length:', rawJsonArrayText.length);
    console.log('rawJsonArrayText start:', rawJsonArrayText.substring(0, 100));
    console.log('rawJsonArrayText end:', rawJsonArrayText.substring(rawJsonArrayText.length - 100));
    const rows = JSON.parse(rawJsonArrayText);
    console.log(`Parsed ${rows.length} rows to insert.`);

    // 3. Insert each row into local database
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const createdAt = row.created_at ? new Date(row.created_at) : new Date();
      const updatedAt = row.updated_at ? new Date(row.updated_at) : new Date();

      // Check if row already exists by querying ID
      const existing = await prisma.$queryRawUnsafe(
        'SELECT id FROM "rmsales_master" WHERE id = $1::uuid',
        row.id
      );

      if (existing && existing.length > 0) {
        skippedCount++;
        continue;
      }

      await prisma.$executeRawUnsafe(
        'INSERT INTO "rmsales_master" (id, firm_name, party_name, product_name, transport_type, created_at, updated_at) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)',
        row.id,
        row.firm_name,
        row.party_name,
        row.product_name,
        row.transport_type,
        createdAt,
        updatedAt
      );
      insertedCount++;
    }

    console.log(`Transport complete. Inserted: ${insertedCount}, Skipped (already exist): ${skippedCount}`);
  } catch (error) {
    console.error('Error during transport:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
