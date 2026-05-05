// Loads environment variables and exposes a typed config object.
// Keeps env access centralized so the rest of the codebase doesn't
// touch process.env directly.

require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 6100),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'centro_hogar_super_secret_2026',
  db: {
    host: process.env.DB_HOST || 'database',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'homelearn_user',
    password: process.env.DB_PASS || 'homelearn_pass',
    database: process.env.DB_NAME || 'homelearn',
  },
};

module.exports = config;
