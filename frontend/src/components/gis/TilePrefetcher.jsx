import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { warmBounds, runWhenIdle } from '../../utils/gis/tilePrefetch';
const INDIA_BOUNDS = { west: 65, south: 4, east: 100, north: 39 };
export default function TilePrefetcher({ urlTemplate, subdomains = 'abc', maxNativeZoom }) {
  const map = useMap();
  const moveTimer = useRef(null);
  const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
  const dataSaver = !!(conn && (conn.saveData || /(^|-)(slow-2g|2g|3g)$/.test(conn.effectiveType || '')));
  useEffect(() => {
    if (!urlTemplate || dataSaver) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      runWhenIdle(() => {
        warmBounds(urlTemplate, subdomains, INDIA_BOUNDS, 3, (typeof maxNativeZoom === 'number' ? Math.min(5, maxNativeZoom) : 5), {
          concurrency: 2,
          maxTiles: 30,
          signal: ctrl.signal
        });
      });
    }, 6000);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [urlTemplate, subdomains, dataSaver, maxNativeZoom]);
  const prefetchAroundView = () => {
    if (!map || !map._loaded || !map._container || !map._container.isConnected) {
      return;
    }
    let z;
    let b;
    try {
      z = Math.round(map.getZoom());
      b = map.getBounds();
    } catch {
      return;
    }
    const padW = (b.getEast() - b.getWest()) * 0.18;
    const padH = (b.getNorth() - b.getSouth()) * 0.18;
    const padded = {
      west: b.getWest() - padW,
      east: b.getEast() + padW,
      south: b.getSouth() - padH,
      north: b.getNorth() + padH
    };
    const ctrl = new AbortController();
    warmBounds(urlTemplate, subdomains, padded, z, z, {
      concurrency: 2,
      maxTiles: 36,
      signal: ctrl.signal
    });
  };
  useMapEvents({
    moveend() {
      if (!urlTemplate || dataSaver) return;
      clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => runWhenIdle(prefetchAroundView), 900);
    }
  });
  useEffect(() => () => clearTimeout(moveTimer.current), []);
  return null;
}
