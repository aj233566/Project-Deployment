export function GisMapLoader({ label = 'Loading operational map', sub }) {
  return (
    <div className="gis-loader-overlay" role="status" aria-live="polite">
      <div className="gis-radar" aria-hidden="true">
        <span className="gis-radar__grid" />
        <span className="gis-radar__sweep" />
        <span className="gis-radar__dot" />
      </div>
      <div className="gis-loader-label">{label}…</div>
      {sub ? <div className="gis-loader-sub">{sub}</div> : null}
    </div>
  );
}
export function GisSkeleton({ variant = 'text', width, className = '', style }) {
  const w = width ? { width } : null;
  return (
    <span
      className={`gis-skeleton gis-skeleton--${variant} ${className}`.trim()}
      style={{ ...w, ...style }}
      aria-hidden="true"
    />
  );
}
export function GisSpinner({ label }) {
  return (
    <span className="gis-inline-loader" role="status" aria-live="polite">
      <span className="gis-inline-spinner" aria-hidden="true" />
      {label ? <span className="gis-inline-loader__label">{label}</span> : null}
    </span>
  );
}
export default GisMapLoader;
