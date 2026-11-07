// The relocation sites (shelters) closest to a person, with the facts that matter in a hurry: how far, how many places are free and
// whether the road in is open. Distances are straight-line, so they are labelled "direct".

const toRad = (degrees) => (degrees * Math.PI) / 180;

export function directKm(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function freePlaces(site) {
  const total = Number(site?.totalCapacity);
  if (!Number.isFinite(total)) return null;
  return Math.max(0, total - (Number(site.occupancy) || 0) - (Number(site.reservedCapacity) || 0));
}

const ROAD_RANK = { OPEN: 0, RESTRICTED: 1, UNKNOWN: 2, BLOCKED: 3 };

// Up to `limit` active sites with a real place, nearest first. A site with a blocked road is kept but never ranked ahead of an open one
// that is within 5 km of the same distance.
export function nearestSites(sites, from, limit = 3) {
  if (!from || !Number.isFinite(from.lat) || !Number.isFinite(from.lng)) return [];
  return (Array.isArray(sites) ? sites : [])
    .filter((site) => site && site.status !== 'INACTIVE' && Array.isArray(site.location?.coordinates))
    .map((site) => {
      const [lng, lat] = site.location.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: String(site._id || `${lat},${lng}`),
        name: site.name || 'Relocation site',
        lat,
        lng,
        km: Number(directKm(from.lat, from.lng, lat, lng).toFixed(1)),
        free: freePlaces(site),
        road: ROAD_RANK[site.roadAccess] === undefined ? 'UNKNOWN' : site.roadAccess,
        facilities: Array.isArray(site.facilities) ? site.facilities.slice(0, 4) : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const gap = a.km - b.km;
      if (Math.abs(gap) > 5) return gap;
      return ROAD_RANK[a.road] - ROAD_RANK[b.road] || gap;
    })
    .slice(0, limit);
}

// A map link for walking or driving there. Only the two places' coordinates are in the link, and only when the person clicks it.
export function directionsUrl(from, to) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;
}
