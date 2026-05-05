// JWT validation middleware. Expects `Authorization: Bearer <token>`.
// Verifies signature + expiration with the shared JWT_SECRET, then attaches
// { id } to req.user. Per the v1 blueprint, Core-Hogar only validates —
// it never issues tokens.
//
// The token's userId claim is what Centro-Hogar emits today; we keep that
// shape intact so existing tokens validate without changes.

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ valid: false, error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ valid: false, error: 'Invalid token payload' });
    }
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
