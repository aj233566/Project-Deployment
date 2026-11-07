import { Fragment, memo } from 'react';
import L from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { pinMarkup } from '../../../utils/commandCenter/fxMarkup';
import { drawableEvents, eventStyle, trackPoints } from '../../../utils/commandCenter/naturalEvents';

const iconCache = new Map();
function eventIcon(style) {
  const key = `${style.color}|${style.glyph}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'sentry-zone-marker natural-event',
      html: `<div class="zone-pin zone-pin-event">${pinMarkup(style.color, style.glyph)}</div>`,
      iconSize: [38, 47],
      iconAnchor: [19, 40],
    }));
  }
  return iconCache.get(key);
}

// Natural events from GDACS (cyclones, floods) and NASA EONET (storms, wildfires, volcanoes, dust, snow ...) on the flat map, with the
// path a cyclone has taken so far. Symbol and colour come from a fixed table (naturalEvents.js), never from the feed text.
function NaturalEventsLayer({ events, visible = true }) {
  if (!visible) return null;
  return drawableEvents(events).map((event) => {
    const style = eventStyle(event);
    const track = trackPoints(event);
    return (
      <Fragment key={event.id}>
        {track.length ? <Polyline positions={track} pathOptions={{ color: style.color, weight: 3, opacity: 0.85, dashArray: '2 8', lineCap: 'round', interactive: false }} /> : null}
        <Marker position={[event.lat, event.lng]} icon={eventIcon(style)} zIndexOffset={700} keyboard={false}>
          <Tooltip direction="top" offset={[0, -34]}>
            <strong>{event.typeLabel}</strong>
            <br />{event.name}
            {event.severity ? <><br />{event.severity}</> : null}
          </Tooltip>
        </Marker>
      </Fragment>
    );
  });
}

export default memo(NaturalEventsLayer);
