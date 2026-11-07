// The big counter from the reference video: a red badge, a title, and a number that jumps each time an incident event plays.
// It appears with the first event and is absent until then, so nothing sits on the map when no incident has been added or changed.
export function IncidentHits({ count }) {
  if (!count) return null;
  return (
    <div className="icc-hits" role="status">
      <span className="icc-hits-badge"><i aria-hidden="true">▲</i> INCIDENT ALERT</span>
      <span className="icc-hits-title">LIVE INCIDENT FEED</span>
      <strong key={count} className="icc-hits-count">{count}<em> {count === 1 ? 'EVENT' : 'EVENTS'}</em></strong>
    </div>
  );
}

// A brief red wash over the map when an event plays; remounting it (new key) restarts the animation.
export function IncidentFlash({ pulse }) {
  return pulse > 0 ? <div key={pulse} className="icc-flash" aria-hidden="true" /> : null;
}
