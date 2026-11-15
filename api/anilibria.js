// KURAI server-side proxy for the official public AniLiberty API and its mirror.
const BASES = ['https://aniliberty.top/api/v1', 'https://api.anilibria.app/api/v1', 'https://anilibria.top/api/v1'];
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const action = String(req.query.action || '');
  const query = String(req.query.query || '').trim().slice(0, 120);
  const id = String(req.query.id || '').trim();
  const mal = String(req.query.mal || '').trim();
  let path;
  if (action === 'search' && query) {
    path = '/app/search/releases?query=' + encodeURIComponent(query);
  } else if (action === 'release' && id && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    path = '/anime/releases/' + encodeURIComponent(id);
  } else if (action === 'episode' && id && /^[a-f0-9-]{20,50}$/i.test(id)) {
    path = '/anime/releases/episodes/' + encodeURIComponent(id);
  } else if (action === 'shikimori' && /^\d{1,10}$/.test(mal)) {
    try {
      const upstream = await fetch('https://shikimori.one/api/animes?ids=' + encodeURIComponent(mal) + '&limit=1', {
        headers: { Accept: 'application/json', 'User-Agent': 'KURAI anime app (https://kurai-anime.vercel.app)' },
        signal: AbortSignal.timeout(9000)
      });
      const body = await upstream.text();
      if (!upstream.ok) return res.status(upstream.status).json({ error: 'Russian metadata provider unavailable' });
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(body);
    } catch (_) {
      return res.status(502).json({ error: 'Russian metadata provider unavailable' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid action or parameters' });
  }
  let lastStatus = 502;
  for (const base of BASES) {
    try {
      const upstream = await fetch(base + path, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(9000)
      });
      const body = await upstream.text();
      lastStatus = upstream.status;
      if (upstream.ok) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).send(body);
      }
    } catch (_) {
      // Try the official mirror if the primary host is unavailable.
    }
  }
  return res.status(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502)
    .json({ error: 'AniLibria API is temporarily unavailable. Please retry.' });
}
