const SUPABASE_HEADERS = {
  'Content-Type': 'application/json',
};

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'), { statusCode: 500 });
  }
  const baseUrl = url
    .replace(/\/$/, '')
    .replace(/\/rest\/v1$/, '');
  return {
    baseUrl,
    key,
  };
}

function restUrl(table, query) {
  const { baseUrl } = config();
  return `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
}

async function supabaseFetch(table, options = {}) {
  const { key } = config();
  const headers = {
    ...SUPABASE_HEADERS,
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(options.prefer ? { Prefer: options.prefer } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(restUrl(table, options.query), {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || response.statusText;
    throw Object.assign(new Error(`Supabase ${options.method || 'GET'} ${table} failed: ${message}`), {
      statusCode: response.status >= 500 ? 502 : response.status,
      payload,
    });
  }

  return payload;
}

function eq(field, value) {
  return `${field}=eq.${encodeURIComponent(value)}`;
}

function inList(field, values) {
  return `${field}=in.(${values.map(v => encodeURIComponent(v)).join(',')})`;
}

async function select(table, query) {
  return supabaseFetch(table, { query });
}

async function insert(table, rows) {
  return supabaseFetch(table, {
    method: 'POST',
    prefer: 'return=representation',
    body: rows,
  });
}

async function patch(table, query, body) {
  return supabaseFetch(table, {
    method: 'PATCH',
    query,
    prefer: 'return=representation',
    body,
  });
}

module.exports = {
  eq,
  inList,
  insert,
  patch,
  select,
  supabaseFetch,
};
