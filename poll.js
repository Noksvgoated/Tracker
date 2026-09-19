// poll.js — runs on GitHub Actions, writes servers.json
const fs = require('fs');

// ==== PLACE IDs ====
const PLACE_IDS = [
  107778070777162,   // Steal An Egg
];

const MAX_PAGES = 20;

async function fetchPage(placeId, cursor) {
  const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100${cursor ? `&cursor=${cursor}` : ''}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ShopifyTracker/1.0' } });
  if (!res.ok) return null;
  return res.json();
}

async function scan(placeId) {
  let all = [];
  let stats = { total: 0, full: 0, empty: 0, open: 0 };
  let cursor = '';
  let page = 0;

  while (page < MAX_PAGES) {
    page++;
    const data = await fetchPage(placeId, cursor);
    if (!data || !data.data) break;

    for (const srv of data.data) {
      stats.total++;
      const p = srv.playing || 0;
      const m = srv.maxPlayers || 0;
      if (m > 0 && p >= m) { stats.full++; continue; }
      if (p === 0) stats.empty++;
      if (srv.id && p < m) {
        stats.open++;
        all.push({ id: srv.id, playing: p, max: m, ping: srv.ping || 0 });
      }
    }

    cursor = data.nextPageCursor;
    if (!cursor) break;
  }

  all.sort((a, b) => a.playing - b.playing || a.ping - b.ping);

  return {
    ts: Date.now(),
    placeId,
    servers: all.slice(0, 50),
    stats,
  };
}

(async () => {
  const out = {};
  for (const placeId of PLACE_IDS) {
    try {
      out[placeId] = await scan(placeId);
    } catch (e) {
      out[placeId] = { error: String(e), ts: Date.now() };
    }
  }
  fs.writeFileSync('servers.json', JSON.stringify(out, null, 2));
  console.log('wrote servers.json');
})();
