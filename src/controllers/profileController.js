// GET /profile
// Returns basic profile info { id, email, name } for the user encoded in
// the JWT. user_id is taken from the token (req.user.id), never from the
// query/body — this enforces the blueprint's security rule.

const pool = require('../config/db');

async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    return res.status(200).json({
      id: String(u.id),
      email: u.email,
      name: u.username,
    });
  } catch (err) {
    console.error('[core-hogar] profile error:', err.message);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}

module.exports = { getProfile };
