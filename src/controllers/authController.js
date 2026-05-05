// GET /auth/validate
// Returns { valid: true, user_id } if the JWT verifies, 401 otherwise.
// Delegates the actual validation to authMiddleware; if we get here the
// token is good.

function validate(req, res) {
  return res.status(200).json({
    valid: true,
    user_id: String(req.user.id),
  });
}

module.exports = { validate };
