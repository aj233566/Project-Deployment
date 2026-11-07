import { memo } from 'react';
import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { pinMarkup } from '../../../utils/commandCenter/fxMarkup';
import { colorOf, distanceText, glyphOf, labelOf, seenText } from '../../../utils/nearbyPeople';

const iconCache = new Map();
function personIcon(color, glyph) {
  const key = `${color}|${glyph}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'sentry-zone-marker nearby-person',
      html: `<div class="zone-pin zone-pin-person">${pinMarkup(color, glyph)}</div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 34],
    }));
  }
  return iconCache.get(key);
}

// People who chose to share their place (first name, status and a place rounded to about 100 m). Drawn as small pins; a citizen sees
// them only while sharing too, and authority accounts always see them.
function NearbyPeopleLayer({ people, visible = true }) {
  if (!visible || !Array.isArray(people) || !people.length) return null;
  return people.map((person) => {
    if (!Number.isFinite(person.lat) || !Number.isFinite(person.lng)) return null;
    return (
      <Marker key={person.id} position={[person.lat, person.lng]} icon={personIcon(colorOf(person), glyphOf(person))} zIndexOffset={600} keyboard={false}>
        <Tooltip direction="top" offset={[0, -30]}>
          <strong>{person.firstName}</strong> · {labelOf(person)}
          {Number.isFinite(person.distanceKm) ? <><br />{distanceText(person.distanceKm)}</> : null}
          <br />{seenText(person.updatedAt)}
        </Tooltip>
      </Marker>
    );
  });
}

export default memo(NearbyPeopleLayer);
