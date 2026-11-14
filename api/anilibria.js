// KURAI server-side proxy for the public AniLiberty API.
const BASE = 'https://anilibria.top/api/v1';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const action = String(req.query.action || '');
  const query = String(req.query.query || '').trim().slice(0, 120);
  const id = String(req.query.id || '').trim();
  let path;
  if (action === 'search' && query) {
    path = '/app/search/releases?query=' + encodeURIComponent(query);
  } else if (action === 'release' && id && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    path = '/anime/releases/' + encodeURIComponent(id);
  } else if (action === 'episode' && id && /^[a-f0-9-]{20,50}$/i.test(id)) {
    path = '/anime/releases/episodes/' + encodeURIComponent(id);
  } else {
    return res.status(400).json({ error: 'Invalid action or parameters' });
  }
  try {
    const upstream = await fetch(BASE + path, { headers: { Accept: 'application/json' } });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(upstream.status).send(body);
  } catch (error) {
    return res.status(502).json({ error: 'AniLiberty API is temporarily unavailable' });
  }
}
