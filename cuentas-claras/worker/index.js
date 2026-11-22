import { createFreebuffAuth, isSameOriginRequest } from '@freebuff/auth';

import { DEFAULT_STATE, REGION_BY_ID } from '../js/data.js';
import { canSeeFunnel } from './access.js';
import { isNotifyConfigured, sendLeadEmail } from './notify.js';

const MAX_BODY = 12000;
const MAX_REPORTS = 20;
const UUID = /^[a-zA-Z0-9-]{8,64}$/;
const RATE_LIMITS = {
  // Un lead real se envía una vez; cinco intentos por cuarto de hora dejan margen a errores.
  leads: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Una visita normal genera pocos eventos; el tope corta ráfagas automatizadas.
  events: { limit: 90, windowMs: 10 * 60 * 1000 },
};

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
  schemaPromise ??= (async () => {
    await env.DB.batch([
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
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          consent_at TEXT NOT NULL,
          consent_text TEXT NOT NULL,
          source TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,
      ),
      env.DB.prepare(
        'CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC)',
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS events (
          name TEXT NOT NULL,
          day TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (name, day)
        )`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          window_start INTEGER NOT NULL,
          hits INTEGER NOT NULL DEFAULT 0
        )`,
      ),
      env.DB.prepare(
        'CREATE INDEX IF NOT EXISTS idx_rate_window ON rate_limits (window_start)',
      ),
    ]);
    // Las ventanas duran minutos: 48 h después la fila ya no sirve para nada.
    try {
      await env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?')
        .bind(Math.floor(Date.now() / 1000) - 172800)
        .run();
    } catch (error) {
      /* la limpieza no debe impedir arrancar el esquema */
    }
  })();
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EVENTS = ['calc_view', 'zone_applied', 'cta_view', 'cta_submit', 'lead_sent'];

function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

/** Solo números y textos cortos: el anuncio del CTA nunca guarda datos personales. */
function sanitizeContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    const cleanKey = cleanText(key, 24);
    if (!cleanKey) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[cleanKey] = Math.round(value * 100) / 100;
    } else if (typeof value === 'string') {
      out[cleanKey] = cleanText(value, 80);
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

function tooMany(seconds) {
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': String(Math.max(1, Math.ceil(seconds))),
      },
    },
  );
}

/** Huella no reversible de la IP: el contador no guarda la dirección. */
async function clientKey(request) {
  const ip = (request.headers.get('CF-Connecting-IP') || '').trim().slice(0, 64) || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`cc-limit:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Devuelve los segundos de espera si la IP supera el tope, o 0 si puede pasar. */
async function rateLimitRetry(env, request, scope, rule) {
  const now = Date.now();
  const start = Math.floor(now / rule.windowMs) * rule.windowMs;
  const key = `${scope}:${await clientKey(request)}:${start}`;
  await env.DB.prepare(
    'INSERT INTO rate_limits (key, window_start, hits) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET hits = hits + 1',
  )
    .bind(key, Math.floor(start / 1000))
    .run();
  const row = await env.DB.prepare('SELECT hits FROM rate_limits WHERE key = ?').bind(key).first();
  if (Number(row?.hits || 0) <= rule.limit) return 0;
  return (start + rule.windowMs - now) / 1000;
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

  if (url.pathname === '/api/leads' && request.method === 'POST') {
    if (!isSameOriginRequest(request, env.APP_ORIGIN)) return json({ error: 'Forbidden' }, 403);
    if (!(await ensureSchema(env))) return json({ error: 'Storage unavailable' }, 503);
    const retry = await rateLimitRetry(env, request, 'leads', RATE_LIMITS.leads);
    if (retry) return tooMany(retry);
    const body = await readBody(request);
    if (body.tooLarge) return json({ error: 'Payload too large' }, 413);
    if (body.invalid) return json({ error: 'Invalid JSON' }, 400);
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    // Honeypot: los bots rellenan el campo oculto; se responde 201 sin guardar nada.
    if (cleanText(data.company, 40)) return json({ ok: true }, 201);
    const name = cleanText(data.name, 80);
    const phone = cleanText(data.phone, 24);
    const email = cleanText(data.email, 120);
    const digits = phone.replace(/\D/g, '');
    if (name.length < 2) return json({ error: 'Name required' }, 400);
    if (digits.length < 9 || digits.length > 15) return json({ error: 'Invalid phone' }, 400);
    if (!EMAIL.test(email)) return json({ error: 'Invalid email' }, 400);
    if (data.consent !== true) return json({ error: 'Consent required' }, 400);
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    const consentText = cleanText(data.consentText, 400) || 'lead-form-v1';
    const context = sanitizeContext(data.context);
    await env.DB.prepare(
      'INSERT INTO leads (id, name, phone, email, consent_at, consent_text, source, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        name,
        phone,
        email,
        at,
        consentText,
        cleanText(data.source, 40) || 'cta',
        JSON.stringify(context),
        at,
      )
      .run();
    // El lead ya está guardado: un fallo de correo no puede perderlo ni romper el 201.
    const mail = await sendLeadEmail(env, { name, phone, email, consentAt: at }, context);
    if (!mail.sent && mail.reason !== 'not-configured') {
      console.error('lead_email_failed', mail.reason);
    }
    return json({ ok: true }, 201);
  }

  if (url.pathname === '/api/events' && request.method === 'POST') {
    if (!isSameOriginRequest(request, env.APP_ORIGIN)) return json({ error: 'Forbidden' }, 403);
    // La analítica es best-effort: si no hay base de datos, se descarta en silencio.
    if (!(await ensureSchema(env))) return new Response(null, { status: 204 });
    const retry = await rateLimitRetry(env, request, 'events', RATE_LIMITS.events);
    if (retry) return tooMany(retry);
    const body = await readBody(request);
    if (body.tooLarge || body.invalid) return new Response(null, { status: 204 });
    const name = cleanText(body.data?.name, 40);
    if (!EVENTS.includes(name)) return new Response(null, { status: 204 });
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      'INSERT INTO events (name, day, count) VALUES (?, ?, 1) ON CONFLICT(name, day) DO UPDATE SET count = count + 1',
    )
      .bind(name, day)
      .run();
    return new Response(null, { status: 204 });
  }

  if (url.pathname === '/api/events' && request.method === 'GET') {
    const user = await instance.getUser(request);
    if (!user) return json({ error: 'Sign in required' }, 401);
    // Ni siquiera los totales: el embudo es del propietario, no de cualquier cuenta.
    if (!canSeeFunnel(env.FUNNEL_EMAILS, user.email)) return json({ error: 'Owner only' }, 403);
    if (!(await ensureSchema(env))) return json({ error: 'Storage unavailable' }, 503);
    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const rows = await env.DB.prepare(
      'SELECT name, day, count FROM events WHERE day >= ? ORDER BY day DESC',
    )
      .bind(since)
      .all();
    const totals = Object.fromEntries(EVENTS.map((name) => [name, 0]));
    const byDay = new Map();
    for (const row of rows.results || []) {
      if (!EVENTS.includes(row.name)) continue;
      let entry = byDay.get(row.day);
      if (!entry) {
        entry = { day: row.day, events: {} };
        byDay.set(row.day, entry);
      }
      const count = Number(row.count) || 0;
      entry.events[row.name] = count;
      totals[row.name] += count;
    }
    const leads = await env.DB.prepare('SELECT COUNT(*) AS n FROM leads').first();
    return json({
      days: [...byDay.values()],
      totals,
      leads: Number(leads?.n || 0),
      notify: isNotifyConfigured(env),
    });
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
