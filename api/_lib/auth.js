const { getHeader } = require('./http');

function tokenFromRequest(req) {
  const auth = getHeader(req, 'authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return getHeader(req, 'x-admin-token') || getHeader(req, 'x-cron-secret') || req.query?.token || req.query?.secret;
}

function requireToken(req, envName, label) {
  const expected = process.env[envName];
  if (!expected) {
    throw Object.assign(new Error(`${envName} is not configured`), { statusCode: 500 });
  }

  const actual = tokenFromRequest(req);
  if (!actual || actual !== expected) {
    throw Object.assign(new Error(`Unauthorized ${label || 'request'}`), { statusCode: 401 });
  }
}

module.exports = {
  requireToken,
};
