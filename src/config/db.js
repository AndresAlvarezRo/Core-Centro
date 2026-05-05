// PostgreSQL pool — shared `homelearn` database with the rest of the suite.
// Core-Hogar reads `users` (owned by Centro-Hogar) and owns `notifications`.
// All queries go through this single pool.

const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

pool.on('error', (err) => {
  console.error('[core-hogar] pg pool error:', err.message);
});

module.exports = pool;
