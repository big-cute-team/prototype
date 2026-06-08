const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3100);

const API_ROUTES = {
  '/api/admin/items': './api/admin/items',
  '/api/admin/review': './api/admin/review',
  '/api/admin/debate': './api/admin/debate',
  '/api/admin/regenerate': './api/admin/regenerate',
  '/api/admin/card-news-draft': './api/admin/card-news-draft',
  '/api/admin/card-news-caption': './api/admin/card-news-caption',
  '/api/admin/card-template-render': './api/admin/card-template-render',
  '/api/admin/card-news-render': './api/admin/card-news-render',
};

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function loadEnv(filename) {
  const envPath = path.join(ROOT, filename);
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(DIST, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(DIST) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, pathname, parsedUrl) {
  const route = API_ROUTES[pathname];
  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Local API route not found' }));
    return;
  }

  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  const handlerPath = path.join(ROOT, route);
  delete require.cache[require.resolve(handlerPath)];
  const handler = require(handlerPath);
  await handler(req, res);
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/index.html not found. Run npm run build first.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    Promise.resolve()
      .then(() => {
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);
        if (parsedUrl.pathname.startsWith('/api/')) return handleApi(req, res, parsedUrl.pathname, parsedUrl);
        return serveStatic(req, res, parsedUrl.pathname);
      })
      .catch(error => {
        res.statusCode = error.statusCode || 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || 'Unexpected local server error' }));
      });
  });

  server.listen(PORT, 'localhost', () => {
    loadEnv('.env.local');
    loadEnv('.env');
    console.log(`Local admin server listening on http://localhost:${PORT}/admin`);
  });
}

main();
