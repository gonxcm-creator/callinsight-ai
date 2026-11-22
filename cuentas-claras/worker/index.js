import { createFreebuffAuth, isSameOriginRequest } from '@freebuff/auth';

import { DEFAULT_STATE, REGION_BY_ID } from '../js/data.js';

const MAX_BODY = 12000;
const MAX_REPORTS = 20;
const UUID = /^[a-zA-Z0-9-]{8,64}$/;

let auth;
let app;
let schemaPromise;

function setup(env) {
  auth ??= createFreebuffAuth({
    clientId: env.FREEBUFF_CLIENT_ID,
    issuer: env.FREEBUFF_ISSUER,
    baseUrl: env.APP_ORIGIN,
  });
  const instance = auth;
  app ??= instance.wrap(async (request, env2) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return api(request, env2, instance, url);
    }
    const response = await env2.ASSETS.fetch(request);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-cache');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  });
  return app;
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function ensureSchema(env) {
  if (!env.DB) return false;
  schemaPromise ??= env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    ),
    env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_id, created_at DESC)',
    ),
  ]);
  try {
    await schemaPromise;
    return true;
  } catch (error) {
    schemaPromise = undefined;
    return false;
  }
}

function cleanName(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 60);
}

function sanitizeState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const key of Object.keys(DEFAULT_STATE)) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === 'label') {
      out.label = cleanName(value);
    } else if (key === 'regionId') {
      out.regionId = REGION_BY_ID[value] ? value : DEFAULT_STATE.regionId;
    } else if (key === 'propertyType') {
      out.propertyType = value === 'nueva' ? 'nueva' : 'usada';
    } else if (key === 'mortgageType') {
      out.mortgageType = ['fixed', 'variable', 'mixed'].includes(value) ? value : 'fixed';
    } else if (key === 'conditionId') {
      out.conditionId = ['reform', 'regular', 'good', 'new'].includes(value) ? value : 'good';
    } else if (key === 'marketRef' || key === 'reformPerM2') {
      out[key] = value === null || value === '' ? null : clampNumber(value, 0, 100000);
    } else if (typeof DEFAULT_STATE[key] === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) out[key] = clampNumber(n, -1000000, 1000000000);
    }
  }
  return out;
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

async function readBody(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY) return { tooLarge: true };
  const text = await request.text();
  if (text.length > MAX_BODY) return { tooLarge: true };
  try {
    return { data: JSON.parse(text) };
  } catch (error) {
    return { invalid: true };
  }
}

async function api(request, env, instance, url) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    const ready = await ensureSchema(env);
    return json({ ok: ready, db: Boolean(env.DB) }, ready ? 200 : 503);
  }

  if (!env.DB) return json({ error: 'Storage unavailable' }, 503);

  if (url.pathname === '/api/reports' && request.method === 'GET') {
    const user = await instance.getUser(request);
    if (!user) return json({ error: 'Sign in required' }, 401);
    if (!(await ensureSchema(env))) return json({ error: 'Storage unavailable' }, 503);
    const result = await env.DB.prepare(
      'SELECT id, name, payload, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    )
      .bind(user.sub)
      .all();
    const reports = (result.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      state: safeParse(row.payload),
    }));
    return json({ reports });
  }

  if (url.pathname === '/api/reports' && request.method === 'POST') {
    if (!isSameOriginRequest(request, env.APP_ORIGIN)) return json({ error: 'Forbidden' }, 403);
    const user = await instance.getUser(request);
    if (!user) return json({ error: 'Sign in required' }, 401);
    const body = await readBody(request);
    if (body.tooLarge) return json({ error: 'Payload too large' }, 413);
    if (body.invalid) return json({ error: 'Invalid JSON' }, 400);
    const name = cleanName(body.data?.name);
    const state = sanitizeState(body.data?.state);
    if (!name) return json({ error: 'Name required' }, 400);
    if (!state) return json({ error: 'Invalid state' }, 400);
    if (!(await ensureSchema(env))) return json({ error: 'Storage unavailable' }, 503);

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE user_id = ?')
      .bind(user.sub)
      .first();
    if (Number(count?.n || 0) >= MAX_REPORTS) return json({ error: 'Report limit reached' }, 409);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO reports (id, user_id, name, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, user.sub, name, JSON.stringify(state), createdAt)
      .run();
    return json({ report: { id, name, createdAt, state } }, 201);
  }

  const match = url.pathname.match(/^\/api\/reports\/([^/]+)$/);
  if (match && request.method === 'DELETE') {
    if (!isSameOriginRequest(request, env.APP_ORIGIN)) return json({ error: 'Forbidden' }, 403);
    const user = await instance.getUser(request);
    if (!user) return json({ error: 'Sign in required' }, 401);
    const id = match[1];
    if (!UUID.test(id)) return json({ error: 'Not found' }, 404);
    if (!(await ensureSchema(env))) return json({ error: 'Storage unavailable' }, 503);
    const result = await env.DB.prepare('DELETE FROM reports WHERE id = ? AND user_id = ?')
      .bind(id, user.sub)
      .run();
    if (!result.meta || result.meta.changes === 0) return json({ error: 'Not found' }, 404);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'self' https://*.freebuff.site https://freebuff.site https://*.freebuff.com https://freebuff.com",
].join('; ');

function secure(response, url) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (url.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const response = await setup(env)(request, env);
      return secure(response, url);
    } catch (error) {
      console.error('worker_error', error && error.message ? error.message : 'unknown');
      return secure(json({ error: 'Server error' }, 500), url);
    }
  },
};
