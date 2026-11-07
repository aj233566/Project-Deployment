const TILE_CACHE = 'cascade-tiles-v5';
const OP_BOUNDS = { w: 88.42, e: 88.68, s: 27.12, n: 27.42 };
const OP_ZOOMS = [10, 11, 12, 13];
const esriUrl = (z, x, y) =>
  `https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
function lon2x(lon, z) { return Math.floor(((lon + 180) / 360) * Math.pow(2, z)); }
function lat2y(lat, z) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z));
}
async function precacheOperationalTiles() {
  try {
    const cache = await caches.open(TILE_CACHE);
    const jobs = [];
    for (const z of OP_ZOOMS) {
      const x0 = lon2x(OP_BOUNDS.w, z), x1 = lon2x(OP_BOUNDS.e, z);
      const y0 = lat2y(OP_BOUNDS.n, z), y1 = lat2y(OP_BOUNDS.s, z);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          jobs.push((async () => {
            try {
              const local = await fetch(`/basetiles/${z}/${x}/${y}.png`, { cache: 'reload' });
              if (!local || !local.ok) return;
              const blob = await local.blob();
              await cache.put(
                new Request(esriUrl(z, x, y)),
                new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } })
              );
            } catch { void 0; }
          })());
        }
      }
    }
    await Promise.all(jobs);
  } catch { void 0; }
}
const TILE_HOSTS = new Set([
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'services.arcgisonline.com',
  'tiles.openfreemap.org',
  'api.tomtom.com'
]);
const MAX_TILES = 4000;
self.addEventListener('install', (event) => {
  event.waitUntil(precacheOperationalTiles().then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== TILE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) {
    const toDelete = keys.slice(0, Math.ceil(keys.length * 0.1));
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}
self.addEventListener('fetch', (event) => {
  let url;
  try { url = new URL(event.request.url); } catch { return; }
  if (event.request.method !== 'GET' || !TILE_HOSTS.has(url.hostname)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(TILE_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        if (resp && resp.ok && resp.status === 200) {
          cache.put(event.request, resp.clone()).then(() => trimCache(cache)).catch(() => {});
        }
        return resp;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
