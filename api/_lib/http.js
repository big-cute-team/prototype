function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }

    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400, cause: error }));
      }
    });
    req.on('error', reject);
  });
}

function handleError(res, error) {
  const statusCode = error.statusCode || error.status || 500;
  json(res, statusCode, {
    error: error.message || 'Unexpected server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
}

module.exports = {
  getHeader,
  handleError,
  json,
  parseJsonBody,
};
