// Looks a place name up on OpenStreetMap (Nominatim). Only the words typed are sent. Returns [{ label, lat, lng }].
export async function searchPlaces(query, signal) {
  const text = String(query || "").trim();
  if (text.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Place search is not available right now.");
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({ label: String(row.display_name || "").split(",").slice(0, 3).join(","), lat: Number(row.lat), lng: Number(row.lon) }))
    .filter((place) => place.label && Number.isFinite(place.lat) && Number.isFinite(place.lng));
}
