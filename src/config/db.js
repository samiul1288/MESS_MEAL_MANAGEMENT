// ============================================================
// MessMate — Database Configuration
// ============================================================

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Prefer a hosted PostgreSQL URL when present; retain local discrete settings.
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'messmate',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

const pool = new Pool({
  ...connectionConfig,
  max: Number.parseInt(process.env.PG_POOL_MAX, 10) || (process.env.VERCEL ? 1 : 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECTION_TIMEOUT_MS, 10) || 10000,
});

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('  PostgreSQL connection established');
    client.release();
  } catch (err) {
    console.error('  PostgreSQL connection error:', err.message);
    throw err;
  }
};

/**
 * Initialize database schema
 */
const initialize = async () => {
  console.log('🔌 Connecting to database...');
  await testConnection();

  // Run schema initialization if needed
  const schemaExists = await pool.query(
    'SELECT 1 FROM information_schema.tables WHERE table_name = $1',
    ['users']
  );

  if (schemaExists.rowCount === 0) {
    console.log('📦 Database schema not found. Running initialization...');
    const schema = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema initialized');
  }

  const migration = fs.readFileSync(
    path.join(__dirname, '../../db/migrations/001_meal_entries_per_creator.sql'),
    'utf8'
  );
  await pool.query(migration);

  const sessionMigration = fs.readFileSync(
    path.join(__dirname, '../../db/migrations/002_postgres_sessions.sql'),
    'utf8'
  );
  await pool.query(sessionMigration);

  const memberAccountMigration = fs.readFileSync(
    path.join(__dirname, '../../db/migrations/003_member_account_group_link.sql'),
    'utf8'
  );
  await pool.query(memberAccountMigration);

  return pool;
};

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  pool,
  testConnection,
  initialize,
};
