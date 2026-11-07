export const DISASTER_ZONES = [
  {
    id: 'sikkim-nh10',
    name: 'Sikkim · NH-10 Landslide',
    hazard: 'Landslide / Road cut',
    center: [27.33, 88.61],
    zoom: 12,
    radiusKm: 18,
    severity: 'critical'
  },
  {
    id: 'assam-floods',
    name: 'Assam · Brahmaputra Floods',
    hazard: 'Riverine flooding',
    center: [26.35, 91.0],
    zoom: 10,
    radiusKm: 40,
    severity: 'high'
  },
  {
    id: 'uttarakhand-joshimath',
    name: 'Uttarakhand · Joshimath',
    hazard: 'Land subsidence / Landslide',
    center: [30.56, 79.56],
    zoom: 11,
    radiusKm: 22,
    severity: 'critical'
  },
  {
    id: 'odisha-cyclone',
    name: 'Odisha · Puri Coast Cyclone',
    hazard: 'Cyclone / Storm surge',
    center: [19.8, 85.83],
    zoom: 10,
    radiusKm: 45,
    severity: 'high'
  },
  {
    id: 'wayanad-kerala',
    name: 'Kerala · Wayanad Landslide',
    hazard: 'Landslide / Debris flow',
    center: [11.6, 76.1],
    zoom: 11,
    radiusKm: 20,
    severity: 'high'
  }
];
export function zoneBounds(zone, pad = 0.35) {
  const [lat, lng] = zone.center;
  return { west: lng - pad, east: lng + pad, south: lat - pad, north: lat + pad };
}
export const INDIA_BOUNDS = { west: 65, south: 4, east: 100, north: 39 };
export const NORTHEAST_BOUNDS = { west: 88.0, south: 21.9, east: 97.6, north: 29.6 };
