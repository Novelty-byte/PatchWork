// Public live dashboard (no login):
//   GET   /api/reports/dashboard   -> { success, count, reports: [...] }
//   PATCH /api/reports/:id/solve   -> { success, message, report: { id, status, solved_at, expires_at } }
const BASE = (import.meta.env.VITE_API_URL || 'https://patch-work-rho.vercel.app').replace(/\/$/, '');
const MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok || (data && data.success === false)) throw new Error((data && (data.message || data.error)) || 'Something went wrong. Please try again.');
  return data;
}

/* ---------- mock data ---------- */
const art = (a, b) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/></svg>`
  );
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const later = (h) => new Date(Date.now() + h * 3600e3).toISOString();
let mockReports = null;
function seed() {
  const imgs = [art('#1d3a5c', '#0f2238'), art('#2f4a3a', '#16261d'), art('#4a3f58', '#241c2e')];
  return [
    { id: 'PW-1048', status: 'open', category: 'Broken Streetlight', location: 'Street 5, near the park entrance', reporter_name: 'Alex Morgan', description: 'Streetlight has been out for two nights. The path by the park entrance is dark after sunset.', verification: { label: 'verified', reason: 'The photos show a dark streetlight pole near a path.' }, media_urls: imgs, created_at: ago(2), solved_at: null, expires_at: null },
    { id: 'PW-1049', status: 'open', category: 'Flooding', location: 'Block C parking, near gate 2', reporter_name: 'Priya Nair', description: 'Water is knee-deep after the rain and cars cannot get out.', verification: { label: 'verified', reason: 'The photo shows standing water in a parking area.' }, media_urls: [imgs[1], imgs[2]], created_at: ago(6), solved_at: null, expires_at: null },
    { id: 'PW-1050', status: 'open', category: 'Pothole', location: 'Main road outside Block A', reporter_name: 'Ravi Kumar', description: 'Deep pothole near the speed bump. Two-wheelers are swerving to avoid it.', verification: { label: 'skipped', reason: 'No photo was attached.' }, media_urls: [], created_at: ago(11), solved_at: null, expires_at: null },
    { id: 'PW-1051', status: 'open', category: 'Sewage', location: 'Lane 3, behind the community hall', reporter_name: 'Sam Patel', description: 'Sewage is overflowing onto the lane and smells very bad.', verification: { label: 'does not match', reason: 'The photo looks like a clear drain, not a sewage overflow.' }, media_urls: [imgs[0]], created_at: ago(15), solved_at: null, expires_at: null },
    { id: 'PW-1052', status: 'open', category: 'Damaged Park', location: "Children's play area", reporter_name: 'Meera Iyer', description: 'One swing frame is bent and the seat hangs loose.', verification: { label: 'unclear', reason: 'The photo is too dark to confirm the damage.' }, media_urls: [imgs[2]], created_at: ago(20), solved_at: null, expires_at: null },
    { id: 'PW-1040', status: 'solved', category: 'Pothole', location: 'Gate 1 entrance road', reporter_name: 'Dev Rao', description: 'Pothole right at the gate.', verification: { label: 'verified', reason: 'The photo shows a pothole on the road.' }, media_urls: [imgs[1]], created_at: ago(9), solved_at: ago(2), expires_at: later(10) },
  ];
}

export async function fetchReports() {
  if (MOCK) {
    await wait(800);
    if (!mockReports) mockReports = seed();
    return mockReports.map((r) => ({ ...r }));
  }
  const data = await request('/api/reports/dashboard');
  return data.reports || [];
}

export async function markSolved(id) {
  if (MOCK) {
    await wait(600);
    const r = mockReports.find((x) => x.id === id);
    if (r) {
      r.status = 'solved';
      r.solved_at = new Date().toISOString();
      r.expires_at = later(12);
    }
    return { status: 'solved', solved_at: r && r.solved_at, expires_at: r && r.expires_at };
  }
  const data = await request(`/api/reports/${encodeURIComponent(id)}/solve`, { method: 'PATCH' });
  return data.report || {};
}
