const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'help_connect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
pool.getConnection((err, conn) => {
  if (err) {
    console.warn('⚠️  Database connection failed:', err.code || err.message);
    console.warn('   Server will still run — fix DB config when ready.');
  } else {
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME);
    conn.release();
  }
});

module.exports = pool.promise();