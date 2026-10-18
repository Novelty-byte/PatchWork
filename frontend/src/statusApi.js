// GET /api/reports/:id -> { success, report: { id, reporter_name, category, location, description,
//   status, verification:{label,reason}, media_urls, created_at, solved_at, expires_at } }
const BASE = (import.meta.env.VITE_API_URL || 'https://patch-work-rho.vercel.app').replace(/\/$/, '');
const MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (kind) => Object.assign(new Error(kind), { kind });

const art = (a, b) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/></svg>`
  );

async function fetchReport(id) {
  if (MOCK) {
    // Try /status/PW-1048, /status/solved, /status/notfound, /status/error
    await wait(900);
    const key = id.toLowerCase();
    if (key === 'error') throw fail('error');
    if (key === 'notfound' || key === 'missing') throw fail('notfound');
    const now = Date.now();
    const solved = key === 'solved';
    return {
      id,
      status: solved ? 'solved' : 'open',
      category: 'Broken Streetlight',
      location: 'Street 5, near the park entrance',
      description: 'Streetlight has been out for two nights.',
      created_at: new Date(now - 2 * 3600e3).toISOString(),
      solved_at: solved ? new Date(now - 3600e3).toISOString() : null,
      expires_at: solved ? new Date(now + 11 * 3600e3).toISOString() : null,
      verification: { label: 'verified', reason: 'The photos show a dark streetlight pole near a path.' },
      media_urls: [art('#1d3a5c', '#0f2238'), art('#2f4a3a', '#16261d'), art('#4a3f58', '#241c2e')],
    };
  }

  let res;
  try {
    res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}`);
  } catch {
    throw fail('error');
  }
  if (res.status === 429) {
    throw Object.assign(new Error('ratelimit'), { kind: 'ratelimit', retryAfter: Number(res.headers.get('Retry-After')) || 0 });
  }
  if (res.status === 404 || res.status === 400) throw fail('notfound');
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok || !data || data.success === false || !data.report) {
    if (data && /not found/i.test(data.message || data.error || '')) throw fail('notfound');
    throw fail('error');
  }
  return data.report;
}

// React in dev mode runs effects twice, which sends two identical requests and can trip the
// backend rate limit. Share one in-flight request per id.
const inflight = new Map();
export function getReport(id) {
  if (inflight.has(id)) return inflight.get(id);
  const p = fetchReport(id).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}
