// Wiring of HTTP routes → controllers. Kept thin on purpose: business logic
// lives in controllers; cross-cutting concerns (auth) in middleware.

const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const appsController = require('../controllers/appsController');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

// Health check (no auth) — useful for readiness probes / smoke tests.
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'core-hogar', version: '0.1.0' });
});

// Auth
router.get('/auth/validate', authMiddleware, authController.validate);

// Profile
router.get('/profile', authMiddleware, profileController.getProfile);

// Apps registry
router.get('/apps', authMiddleware, appsController.listApps);

// Notifications
//   - Ingest is open by design (the v1 blueprint marks Authorization as
//     "opcional según origen"); the source_app allow-list + payload
//     validation are the gate. Production hardening (HMAC / mTLS / shared
//     secret per app) is explicit future work.
router.post('/events/notification', notificationsController.ingestNotification);
router.get('/notifications', authMiddleware, notificationsController.listNotifications);

module.exports = router;
