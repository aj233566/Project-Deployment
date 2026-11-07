// Narrows each kind of record to the active Command Center view (all India, Delhi NCR, or one state).
// State views use the boundary index when it is loaded; every helper falls back to the view's bounding box.

import { regionContains } from '../gis/commandCenterRegions.js';

const asArray = (value) => (Array.isArray(value) ? value : []);

function lngLat(record) {
  const [lng, lat] = record?.location?.coordinates || [];
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function latLng(record) {
  const lat = record?.location?.latitude ?? record?.location?.lat ?? record?.lat;
  const lng = record?.location?.longitude ?? record?.location?.lng ?? record?.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// Habitations and relocation sites keep GeoJSON-style [lng, lat] coordinates.
export function filterGeoJsonRecords(records, region, index) {
  return asArray(records).filter((record) => {
    const point = lngLat(record);
    return point ? regionContains(region, point.lat, point.lng, index) : false;
  });
}

// SENTRY risk-engine alerts and USGS / GDACS items carry plain latitude and longitude.
export function filterPointRecords(records, region, index) {
  return asArray(records).filter((record) => {
    const point = latLng(record);
    return point ? regionContains(region, point.lat, point.lng, index) : false;
  });
}

// Earthquakes just offshore or across a border still matter to a region, so they are kept within 1.5 degrees of its box.
export function filterNearbyEvents(events, region, margin = 1.5) {
  const [[south, west], [north, east]] = region.bounds;
  return asArray(events).filter((event) => (
    Number.isFinite(event?.lat) && Number.isFinite(event?.lng)
    && event.lat >= south - margin && event.lat <= north + margin
    && event.lng >= west - margin && event.lng <= east + margin
  ));
}

// The same polled feed with only the events near this view. The all-India view keeps everything.
export function scopeFeedToRegion(feed, region, margin = 1.5) {
  if (region.kind === 'national' || !Array.isArray(feed.data)) return feed;
  return { ...feed, data: filterNearbyEvents(feed.data, region, margin) };
}

// The air-quality reading for the place the header weather describes: the monitored place nearest to the view's
// weather point (within about 30 km), or none when the view is all of India.
export function airAtWeatherPoint(region, airReadings) {
  if (region.kind === 'national' || !Array.isArray(airReadings)) return null;
  const [lat, lng] = region.weatherPoint;
  let best = null;
  for (const place of region.forecastPlaces) {
    const distance = Math.hypot(place.lat - lat, place.lng - lng);
    if (!best || distance < best.distance) best = { place, distance };
  }
  if (!best || best.distance > 0.3) return null;
  return airReadings.find((reading) => reading.name === best.place.name) || null;
}

// Resources are registered with a free-text place, so match it against the view's name and place names.
export function resourcesInRegion(resources, region) {
  if (region.kind === 'national') return asArray(resources);
  const keywords = [...(region.districtKeywords || []), ...(region.placeKeywords || [])];
  if (region.kind === 'region') keywords.push('delhi', 'ncr');
  return asArray(resources).filter((resource) => {
    const text = String(resource?.location || '').toLowerCase();
    return text && keywords.some((keyword) => text.includes(keyword));
  });
}
