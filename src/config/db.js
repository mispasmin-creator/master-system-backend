const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL || 'https://kabumduxzghvigwszyko.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Oo-QWtWIV137WvtHW0GKuQ_K6VMKuMg';
const supabase = createClient(supabaseUrl, supabaseKey);

const connectDB = async () => {
  try {
    // Warn the user if they haven't set the database password yet
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('[YOUR_DB_PASSWORD]')) {
      console.log('--------------------------------------------------');
      console.log('⚠️  DATABASE_URL still contains [YOUR_DB_PASSWORD] placeholder.');
      console.log('Please replace it in the .env file with your actual password.');
      console.log('--------------------------------------------------');
      return;
    }
    await prisma.$connect();
    console.log('PostgreSQL Connected successfully via Prisma.');
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Attach clients to the connectDB function for easy CJS importing
connectDB.prisma = prisma;
connectDB.supabase = supabase;

module.exports = connectDB;
