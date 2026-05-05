// GET /apps
// Returns the static apps registry. v1: enabled apps only, in the order
// declared in config/apps.js. Future v2 will load from DB and support
// runtime mutation.

const { APPS } = require('../config/apps');

function listApps(_req, res) {
  return res.status(200).json(
    APPS.filter((a) => a.enabled).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      enabled: a.enabled,
    }))
  );
}

module.exports = { listApps };
