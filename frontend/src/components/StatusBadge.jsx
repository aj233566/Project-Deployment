function StatusBadge({ status, synced }) {
  let className = 'status-badge'
  if (status === 'Resolved') {
    className += ' status-resolved'
  } else if (status === 'In Progress') {
    className += ' status-progress'
  } else if (status === 'Verified') {
    className += ' status-verified'
  } else {
    className += ' status-submitted'
  }
  return (
    <div className="status-wrapper">
      <span className={className}>
        {status}
      </span>

      {synced === false && (
        <span className="sync-badge">
          Pending Sync
        </span>
      )}
    </div>
  )
}
export default StatusBadge