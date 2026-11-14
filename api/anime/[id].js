
const API = 'https://api.mikai.me/public/v1';
const BASE = 'https://kurai-anime.vercel.app';

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);
}

function posterOf(a) {
  return a?.images?.poster?.big?.webp ||
    a?.images?.poster?.medium?.webp ||
    a?.images?.poster?.big?.jpg ||
    a?.images?.poster?.medium?.jpg || '';
}

module.exports = async (req, res) => {
  try {
    let id = req.query.id;
    if (Array.isArray(id)) id = id[0];

    if (!id || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) {
      return res.status(400).send('Invalid anime ID');
    }

    const ref = id.startsWith('slug-')
      ? 'slug:' + id.slice(5)
      : id;

    const response = await fetch(
      API + '/anime/' + encodeURIComponent(ref),
      { headers: { Accept: 'application/json' } }
    );

    const json = await response.json();

    if (!response.ok || !json.ok || !json.result) {
      return res.status(404).send('Anime not found');
    }

    const a = json.result;
    const title = a.titles?.ua ||
      a.titles?.english ||
      a.titles?.original || 'Аніме';

    const description = (a.description ||
      `Дізнайся більше про аніме ${title} на KURAI - anime.`)
      .slice(0, 300);

    const image = posterOf(a);
    const canonical = `${BASE}/anime/${encodeURIComponent(id)}`;
    const appUrl = `${BASE}/?anime=${encodeURIComponent(ref)}`;
    const genres = (a.genres || [])
      .map(g => typeof g === 'string' ? g : g.ua || g.name)
      .filter(Boolean);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: title,
      description,
      inLanguage: 'uk-UA',
      image: image || undefined,
      url: canonical
    };

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    res.status(200).send(`<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} українською | KURAI - anime</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="video.tv_show">
<meta property="og:site_name" content="KURAI - anime">
<meta property="og:title" content="${esc(title)} | KURAI">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<style>
body{margin:0;background:#09090d;color:#eee;font:16px Arial,sans-serif}
main{max-width:950px;margin:50px auto;padding:24px}
a{color:#ff6478}
article{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
img{width:220px;max-width:100%;border-radius:12px}
h1{font-size:32px}
p{line-height:1.7;color:#c6c4ce}
.tag{display:inline-block;background:#24242e;padding:7px 11px;border-radius:20px;margin:4px}
.btn{display:inline-block;background:#e63950;color:white;padding:13px 20px;border-radius:9px;text-decoration:none;margin-top:15px}
</style>
</head>
<body>
<main>
<a href="/">← KURAI - anime</a>
<article>
${image ? `<img src="${esc(image)}" alt="${esc(title)}">` : ''}
<div>
<p>KURAI ANIME DATABASE</p>
<h1>${esc(title)}</h1>
<p>${esc(a.titles?.original || '')}</p>
<p>${esc(a.year || '')} · ${esc(a.format || 'Аніме')} · ${esc(a.status || '')}</p>
<p>${esc(description)}</p>
<div>${genres.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div>
<a class="btn" href="${esc(appUrl)}">ВІДКРИТИ В KURAI →</a>
</div>
</article>
</main>
</body>
</html>`);
} catch (error) {
  console.error('KURAI anime SEO error:', error);
    res.status(500).send(
    'KURAI ERROR: ' + (error?.message || String(error))
  );
  }
};
