// Frame used by every command-center panel: title bar with an optional icon, kicker and actions.
export function Panel({ title, kicker, icon: Icon, actions, toolbar, children, className = '', bodyClassName = '', ...rest }) {
  return (
    <section className={`icc-panel ${className}`} {...rest}>
      <header className="icc-panel-head">
        <h2 className="icc-panel-title">
          {Icon ? <Icon size={22} aria-hidden="true" /> : null}
          <span>{title}</span>
        </h2>
        {kicker ? <span className="icc-panel-kicker">{kicker}</span> : null}
        {actions ? <div className="icc-panel-actions">{actions}</div> : null}
      </header>
      {toolbar ? <div className="icc-panel-toolbar">{toolbar}</div> : null}
      <div className={`icc-panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

// Shows loading / unavailable / stale states for a polled feed, then the content once data exists.
export function FeedState({ feed, label, children, empty = false, emptyText = 'Nothing to show right now.' }) {
  const hasData = feed.data !== null && feed.data !== undefined;
  if (!hasData && feed.status === 'loading') {
    return <p className="icc-state" role="status">Loading {label}…</p>;
  }
  if (!hasData) {
    return <p className="icc-state icc-state-error" role="status">{label} unavailable{feed.error ? ` — ${feed.error}` : ''}.</p>;
  }
  return (
    <>
      {feed.status === 'error' ? (
        <p className="icc-state icc-state-warn" role="status">Showing the last update; the latest refresh failed.</p>
      ) : null}
      {empty ? <p className="icc-state">{emptyText}</p> : children}
    </>
  );
}

const LEVEL_LABEL = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', unknown: 'UNRATED' };

export function SeverityBadge({ level }) {
  return <span className={`icc-badge icc-badge-${level || 'unknown'}`}>{LEVEL_LABEL[level] || LEVEL_LABEL.unknown}</span>;
}

export function ToneBadge({ tone, children }) {
  return <span className={`icc-badge icc-badge-${tone}`}>{children}</span>;
}

export function MiniBar({ value, max, tone = 'cyan', label }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span className="icc-minibar" role="img" aria-label={label}>
      <i className={`icc-minibar-fill icc-tone-${tone}`} style={{ width: `${percent}%` }} />
    </span>
  );
}
