// Notifications endpoints.
//   POST /events/notification — ingest from sibling apps.
//   GET  /notifications        — read by the authenticated user.
//
// Allow-list: only apps present in the static registry (config/apps.js)
// can publish. Per the v1 blueprint, signature/HMAC validation is out of
// scope — the LAN-only deployment + JWT on the consume side are enough.

const pool = require('../config/db');
const { APP_IDS } = require('../config/apps');

const MAX_MESSAGE_LEN = 2000;

async function ingestNotification(req, res) {
  const { user_id, source_app, message } = req.body || {};

  // Payload shape validation
  if (!user_id || !source_app || !message) {
    return res
      .status(400)
      .json({ error: 'user_id, source_app and message are required' });
  }
  if (typeof message !== 'string' || message.length === 0) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return res
      .status(400)
      .json({ error: `message must be <= ${MAX_MESSAGE_LEN} chars` });
  }

  // Origin allow-list
  if (!APP_IDS.has(String(source_app))) {
    return res.status(403).json({ error: 'Unknown source_app' });
  }

  // user_id must correspond to an existing user
  const userIdNum = Number(user_id);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    return res.status(400).json({ error: 'user_id must be a positive number' });
  }

  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1', [
      userIdNum,
    ]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'user_id not found' });
    }

    await pool.query(
      `INSERT INTO notifications (user_id, source_app, message)
       VALUES ($1, $2, $3)`,
      [userIdNum, source_app, message]
    );

    return res.status(201).json({ status: 'stored' });
  } catch (err) {
    console.error('[core-hogar] ingest notification error:', err.message);
    return res.status(500).json({ error: 'Failed to store notification' });
  }
}

async function listNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, source_app, message, created_at, read
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [req.user.id]
    );

    return res.status(200).json(
      result.rows.map((n) => ({
        id: String(n.id),
        source_app: n.source_app,
        message: n.message,
        created_at: n.created_at.toISOString(),
        read: n.read,
      }))
    );
  } catch (err) {
    console.error('[core-hogar] list notifications error:', err.message);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
}

module.exports = { ingestNotification, listNotifications };
