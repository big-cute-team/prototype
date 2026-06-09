const crypto = require('crypto');
const { requireToken } = require('../_lib/auth');
const { handleError, json } = require('../_lib/http');

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const BUCKET = 'cards';
const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function storageBase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'), { statusCode: 500 });
  }
  const baseUrl = url.replace(/\/$/, '').replace(/\/rest\/v1$/, '');
  return { baseUrl, key };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(Object.assign(new Error('Image too large (max 4MB)'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const mime = String(req.headers['content-type'] || '').split(';')[0].trim();
    const ext = EXT_BY_MIME[mime];
    if (!ext) {
      throw Object.assign(new Error(`Unsupported image type: ${mime || 'none'}`), { statusCode: 400 });
    }

    const body = await readRawBody(req);
    if (!body.length) throw Object.assign(new Error('Empty body'), { statusCode: 400 });

    const { baseUrl, key } = storageBase();
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

    const uploadRes = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      throw Object.assign(new Error(`Storage upload failed: ${text || uploadRes.status}`), {
        statusCode: uploadRes.status >= 500 ? 502 : uploadRes.status,
      });
    }

    const url = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    json(res, 200, { ok: true, url });
  } catch (error) {
    handleError(res, error);
  }
};
