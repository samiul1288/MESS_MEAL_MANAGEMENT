const { initialize, pool } = require('../src/config/db');

async function migrate() {
  try {
    await initialize();
    console.log('Database schema and migrations are up to date.');
  } catch (error) {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
