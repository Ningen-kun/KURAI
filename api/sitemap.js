const API = 'https://api.mikai.me/public/v1';
const BASE = 'https://kurai-anime.vercel.app';

function xmlEscape(value) {
  return String(value).replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[c]);
}

module.exports = async (req, res) => {
  try {
    const urls = new Set();

    // Отримуємо до 10 сторінок каталогу
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(
        `${API}/anime?page=${page}&limit=30`,
        {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'KURAI-Anime/1.0 (+https://kurai-anime.vercel.app)'
  }
}
      );

      if (!response.ok) {
        throw new Error(`Mikai API error: ${response.status}`);
      }

      const json = await response.json();
      const result = json.result;

      const animeList = Array.isArray(result)
        ? result
        : result?.items || result?.anime || result?.data || [];

      if (!animeList.length) break;

      for (const anime of animeList) {
        const mikaiId = anime?.ids?.mikai;
        const slug = anime?.ids?.slug;

        let id = '';

        if (slug) {
          id = 'slug-' + slug;
        } else if (mikaiId !== undefined && mikaiId !== null) {
          id = String(mikaiId);
        }

        if (/^[a-zA-Z0-9_-]{1,150}$/.test(id)) {
          urls.add(`${BASE}/anime/${encodeURIComponent(id)}`);
        }
      }

      if (animeList.length < 30) break;
    }

    const entries = [...urls].map(url => `
  <url>
    <loc>${xmlEscape(url)}</loc>
    <changefreq>weekly</changefreq>
  </url>`).join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>${entries}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(sitemap);
      } catch (error) {
    console.error('KURAI sitemap error:', error);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send(
      'KURAI ERROR: ' + (error?.message || String(error))
    );
  }
};
