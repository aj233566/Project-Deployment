const EARTH_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function straightLineKm(a, b) {
  if (!a || !b) return null;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function bearing(a, b) {
  if (!a || !b) return null;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const degrees = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return { degrees, compass: COMPASS[Math.round(degrees / 45) % 8] };
}
export function siteAvailableCapacity(site) {
  const total = Number(site?.totalCapacity ?? site?.capacity);
  if (!Number.isFinite(total)) return null;
  const occupancy = Number(site?.occupancy);
  const reserved = Number(site?.reservedCapacity);
  const used = (Number.isFinite(occupancy) ? occupancy : 0) + (Number.isFinite(reserved) ? reserved : 0);
  return Math.max(0, total - used);
}
function pointOf(entity) {
  const c = entity?.location?.coordinates;
  if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
    return { lat: c[1], lng: c[0] };                         
  }
  if (Number.isFinite(entity?.lat) && Number.isFinite(entity?.lng)) {
    return { lat: entity.lat, lng: entity.lng };
  }
  return null;
}
export function rankRelocationSites(habitation, sites = []) {
  const from = pointOf(habitation);
  if (!from) return [];
  const population = Number(habitation?.population);
  const pop = Number.isFinite(population) ? population : null;
  const ranked = (sites || [])
    .map((site) => {
      const to = pointOf(site);
      if (!to) return null;
      const availableCapacity = siteAvailableCapacity(site);
      const distanceKm = straightLineKm(from, to);
      const brg = bearing(from, to);
      const canAbsorb = pop != null && availableCapacity != null ? availableCapacity >= pop : null;
      return { site, to, distanceKm, bearing: brg, availableCapacity, population: pop, canAbsorb };
    })
    .filter(Boolean);
  const tier = (c) => (c.canAbsorb === true ? 0 : (c.availableCapacity ?? 0) > 0 ? 1 : 2);
  ranked.sort((a, b) => {
    const t = tier(a) - tier(b);
    if (t !== 0) return t;
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });
  return ranked;
}
export function bestRelocationSite(habitation, sites = []) {
  return rankRelocationSites(habitation, sites)[0] || null;
}
