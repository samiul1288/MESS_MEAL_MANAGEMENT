const bcrypt = require('bcrypt');
const { initialize, pool } = require('../src/config/db');

function getAdminConfig() {
  const admin = {
    fullName: process.env.ADMIN_FULL_NAME?.trim(),
    username: process.env.ADMIN_USERNAME?.trim(),
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD,
  };
  const missing = Object.entries(admin)
    .filter(([, value]) => !value)
    .map(([key]) => `ADMIN_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

  if (missing.length) {
    throw new Error(`Missing required admin settings: ${missing.join(', ')}`);
  }
  if (admin.fullName.length < 2) {
    throw new Error('ADMIN_FULL_NAME must be at least 2 characters.');
  }
  if (admin.username.length < 3 || admin.username.length > 50) {
    throw new Error('ADMIN_USERNAME must be between 3 and 50 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email) || admin.email.length > 100) {
    throw new Error('ADMIN_EMAIL must be a valid email address of at most 100 characters.');
  }
  if (admin.password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  return admin;
}

async function seedAdmin() {
  try {
    const admin = getAdminConfig();
    await initialize();
    const passwordHash = await bcrypt.hash(admin.password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'admin', TRUE)
       ON CONFLICT (username) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         role = 'admin',
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id`,
      [admin.username, admin.email, passwordHash, admin.fullName]
    );

    console.log(`Admin account seeded successfully (user id: ${result.rows[0].id}).`);
  } catch (error) {
    console.error('Admin seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedAdmin();
