const API = 'https://api.mikai.me/public/v1';
const BASE = 'https://kurai-anime.vercel.app';
const USER_AGENT = 'KURAI-Anime/1.0 (+https://kurai-anime.vercel.app)';

function xmlEscape(value) {
  return String(value).replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[c]);
}

async function getAnimePage(page) {
  const response = await fetch(`${API}/anime?page=${page}&limit=100`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 250);
    throw new Error(`Mikai API error: HTTP ${response.status}${details ? ' — ' + details : ''}`);
  }

  const json = await response.json();
  if (!json || json.ok !== true || !Array.isArray(json.result)) {
    throw new Error('Mikai API returned an unexpected catalogue response');
  }

  return json;
}

module.exports = async (req, res) => {
  try {
    const firstPage = await getAnimePage(1);
    const pages = Math.max(1, Math.min(Number(firstPage.pages) || 1, 500));
    const animeList = [...firstPage.result];

    for (let page = 2; page <= pages; page++) {
      const data = await getAnimePage(page);
      animeList.push(...data.result);
    }

    const urls = new Set([`${BASE}/`]);

    for (const anime of animeList) {
      if (anime?.isAdult === true) continue;

      const id = anime?.ids?.mikai;
      if (id === undefined || id === null || !/^\\d+$/.test(String(id))) continue;

      urls.add(`${BASE}/anime/${encodeURIComponent(String(id))}`);
    }

    const entries = [...urls].map(url => `
  <url>
    <loc>${xmlEscape(url)}</loc>
  </url>`).join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('KURAI sitemap error:', error);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).send('KURAI sitemap temporarily unavailable');
  }
};
