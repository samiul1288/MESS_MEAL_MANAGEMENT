// ============================================================
// MessMate — Main Application Entry Point
// ============================================================

const app = require('./app');
const db = require('./config/db');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Initialize database connection
db.initialize()
  .then(() => {
    console.log('✅ Database connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 MessMate server running at http://localhost:${PORT}`);
      console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
