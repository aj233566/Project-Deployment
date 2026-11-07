import { tilesForBounds, buildTileUrl } from './tileMath.js';
const requested = new Set();                                     
export function runWhenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 200);
  }
}
async function pool(urls, concurrency, signal, onProgress) {
  let i = 0;
  let done = 0;
  const total = urls.length;
  const worker = async () => {
    while (i < urls.length) {
      if (signal && signal.aborted) return;
      const url = urls[i++];
      if (!requested.has(url)) {
        requested.add(url);
        try {
          const r = await fetch(url, { mode: 'cors', cache: 'force-cache' });
          if (!r.ok) requested.delete(url);                                  
        } catch {
          requested.delete(url);                                 
        }
      }
      done++;
      if (onProgress && (done % 5 === 0 || done === total)) onProgress(done, total);
    }
  };
  const n = Math.max(1, Math.min(concurrency, urls.length));
  await Promise.all(Array.from({ length: n }, worker));
}
export function tileUrlsForBounds(template, subdomains, bounds, zMin, zMax, maxTiles = 60000) {
  const subs = subdomains && subdomains.length ? subdomains.split('') : ['a'];
  const urls = [];
  for (let z = zMin; z <= zMax && urls.length < maxTiles; z++) {
    const tiles = tilesForBounds(bounds, z);
    for (let k = 0; k < tiles.length && urls.length < maxTiles; k++) {
      const { x, y } = tiles[k];
      urls.push(buildTileUrl(template, z, x, y, subs[(x + y) % subs.length]));
    }
  }
  return urls;
}
export async function downloadPack(template, subdomains, regions, opts = {}) {
  const { concurrency = 6, signal, onProgress, maxTiles = 60000 } = opts;
  let urls = [];
  for (const r of regions) {
    urls = urls.concat(tileUrlsForBounds(template, subdomains, r.bounds, r.zMin, r.zMax, maxTiles));
    if (urls.length >= maxTiles) break;
  }
  urls = [...new Set(urls)];
  await pool(urls, concurrency, signal, onProgress);
  return urls.length;
}
export function warmBounds(template, subdomains, bounds, zMin, zMax, opts = {}) {
  const { concurrency = 4, maxTiles = 400, signal } = opts;
  const subs = subdomains && subdomains.length ? subdomains.split('') : ['a'];
  const urls = [];
  for (let z = zMin; z <= zMax && urls.length < maxTiles; z++) {
    const tiles = tilesForBounds(bounds, z);
    for (let k = 0; k < tiles.length && urls.length < maxTiles; k++) {
      const { x, y } = tiles[k];
      const sub = subs[(x + y) % subs.length];
      urls.push(buildTileUrl(template, z, x, y, sub));
    }
  }
  return pool(urls, concurrency, signal);
}
export function warmedCount() {
  return requested.size;
}
