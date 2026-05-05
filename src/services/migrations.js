// Idempotent SQL migration runner. Applied at boot before app.listen().
// Same pattern as Centro-Hogar's backend so the operational model stays
// uniform across the suite.

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrations() {
  const dir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`[core-hogar] migration applied: ${file}`);
    } catch (err) {
      console.error(`[core-hogar] migration failed: ${file}`, err.message);
      throw err;
    }
  }
}

module.exports = { runMigrations };
