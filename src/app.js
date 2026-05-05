// Core-Hogar — Core-API v1 entry point.
// Boots Express, applies CORS for any LAN origin (same policy as the rest
// of the suite), runs idempotent migrations, then starts listening.

const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const routes = require('./routes');
const { runMigrations } = require('./services/migrations');

// Same LAN regex Centro-Hogar uses — keeps the suite's CORS policy uniform.
const LAN_REGEX =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(?:192\.168\.\d{1,3}\.\d{1,3})|(?:172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(?::\d{2,5})?$/;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (LAN_REGEX.test(origin)) return cb(null, true);
      return cb(null, true); // permissive for the home LAN deployment
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(routes);

// Generic error handler — keeps the API contract consistent.
app.use((err, _req, res, _next) => {
  console.error('[core-hogar] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

runMigrations()
  .then(() => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[core-hogar] listening on :${config.port}`);
    });
  })
  .catch((err) => {
    console.error('[core-hogar] startup aborted:', err.message);
    process.exit(1);
  });
