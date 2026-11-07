import { useRef } from 'react';
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth';
import { formatDischarge } from '../../utils/commandCenter/riverStatus';

const TONE_COLORS = { orange: '#d97732', yellow: '#c9a227', green: '#3d8b63', blue: '#4f7c8a', muted: '#7f8a8f', red: '#d64545' };

// Both charts are drawn at their real pixel width (no scaled viewBox), so their labels keep the page's text size.
const CHAR_PX = 12;
const labelWidth = (labels) => Math.max(...labels.map((label) => String(label).length)) * CHAR_PX + 14;

// River discharge over the last 14 days (solid) and the 7-day model forecast (dashed).
export function RiverChart({ series, tone = 'blue', unit = 'm³/s' }) {
  const boxRef = useRef(null);
  const width = useMeasuredWidth(boxRef);
  const points = (series || []).filter((point) => point.value !== null);
  if (points.length < 2) {
    return <div ref={boxRef} className="icc-chart-box"><p className="icc-state">Not enough data to draw a trend.</p></div>;
  }
  const height = 190;
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(...points.map((point) => point.value));
  const span = Math.max(max - min, max * 0.1, 1);
  const lo = Math.max(0, min - span * 0.15);
  const hi = max + span * 0.15;
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const pad = { left: labelWidth(ticks.map(formatDischarge)), right: 12, top: 12, bottom: 32 };
  const x = (index) => pad.left + (index / (series.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - lo) / (hi - lo)) * (height - pad.top - pad.bottom);
  const coords = series.map((point, index) => (point.value === null ? null : [x(index), y(point.value)]));
  const pastIndexes = series.map((point, index) => (!point.future && point.value !== null ? index : -1)).filter((i) => i >= 0);
  const futureIndexes = series.map((point, index) => (point.future && point.value !== null ? index : -1)).filter((i) => i >= 0);
  const lastPast = pastIndexes.at(-1);
  const line = (indexes) => indexes.map((i, n) => `${n === 0 ? 'M' : 'L'}${coords[i][0].toFixed(1)},${coords[i][1].toFixed(1)}`).join(' ');
  const color = TONE_COLORS[tone] || TONE_COLORS.blue;
  const baseY = height - pad.bottom;
  const area = pastIndexes.length > 1
    ? `${line(pastIndexes)} L${coords[lastPast][0].toFixed(1)},${baseY} L${coords[pastIndexes[0]][0].toFixed(1)},${baseY} Z`
    : '';
  const todayCoord = coords[lastPast];
  const futureLine = futureIndexes.length ? line([lastPast, ...futureIndexes]) : '';
  const firstDate = series[0].date.slice(5);
  const lastDate = series.at(-1).date.slice(5);
  // "today" sits mid-chart; keep the end dates from running into it on narrow charts.
  const showEndDates = width - pad.left - pad.right > 330;
  return (
    <div ref={boxRef} className="icc-chart-box">
      <svg className="icc-chart" width={width} height={height} role="img" aria-label={`River discharge, ${unit}: last ${pastIndexes.length} days and forecast`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="icc-chart-grid" />
            <text x={pad.left - 6} y={y(tick) + 6} textAnchor="end" className="icc-chart-label">{formatDischarge(tick)}</text>
          </g>
        ))}
        {area ? <path d={area} fill={color} opacity="0.16" /> : null}
        <path d={line(pastIndexes)} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
        {futureLine ? <path d={futureLine} fill="none" stroke={color} strokeWidth="2.2" strokeDasharray="5 4" opacity="0.85" /> : null}
        <line x1={todayCoord[0]} x2={todayCoord[0]} y1={pad.top} y2={baseY} className="icc-chart-today" />
        <circle cx={todayCoord[0]} cy={todayCoord[1]} r="4.5" fill={color} stroke="#04101e" strokeWidth="1.5" />
        {showEndDates ? <text x={pad.left} y={height - 6} className="icc-chart-label">{firstDate}</text> : null}
        <text x={todayCoord[0]} y={height - 6} textAnchor="middle" className="icc-chart-label icc-chart-label-strong">today</text>
        {showEndDates ? <text x={width - pad.right} y={height - 6} textAnchor="end" className="icc-chart-label">{lastDate}</text> : null}
      </svg>
    </div>
  );
}

const SEVERITY_LINES = [
  { key: 'critical', color: '#d64545', label: 'Critical' },
  { key: 'high', color: '#d97732', label: 'High' },
  { key: 'medium', color: '#c9a227', label: 'Medium' },
  { key: 'low', color: '#3d8b63', label: 'Low' },
];

function bucketLabel(bucket, windowKey) {
  const date = new Date(bucket.start);
  if (windowKey === '24h') {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(date);
  }
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }).format(date);
}

// Incidents per bucket, one line per severity, like the reference trend panel.
export function TrendChart({ trend }) {
  const boxRef = useRef(null);
  const width = useMeasuredWidth(boxRef);
  const { buckets, max, windowKey } = trend;
  const height = 200;
  const top = Math.max(max, 3);
  const gridValues = [0, Math.round(top / 2), top];
  const pad = { left: labelWidth(gridValues), right: 14, top: 12, bottom: 32 };
  const x = (index) => pad.left + (buckets.length === 1 ? 0.5 : index / (buckets.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - value / top) * (height - pad.top - pad.bottom);
  const labelIndexes = [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1];
  return (
    <div ref={boxRef} className="icc-chart-box">
      <svg className="icc-chart" width={width} height={height} role="img" aria-label={`Incidents reported per ${windowKey === '24h' ? 'hour' : 'day'} by severity`}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} className="icc-chart-grid" />
            <text x={pad.left - 6} y={y(value) + 6} textAnchor="end" className="icc-chart-label">{value}</text>
          </g>
        ))}
        {SEVERITY_LINES.map((line) => {
          const path = buckets.map((bucket, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(bucket[line.key]).toFixed(1)}`).join(' ');
          const hasData = buckets.some((bucket) => bucket[line.key] > 0);
          return (
            <g key={line.key} opacity={hasData ? 1 : 0.35}>
              <path d={path} fill="none" stroke={line.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              {buckets.map((bucket, index) => (bucket[line.key] > 0
                ? <circle key={bucket.start} cx={x(index)} cy={y(bucket[line.key])} r="4" fill={line.color} />
                : null))}
            </g>
          );
        })}
        {labelIndexes.map((index, position) => (
          <text key={index} x={x(index)} y={height - 6} textAnchor={position === 0 ? 'start' : position === 2 ? 'end' : 'middle'} className="icc-chart-label">
            {bucketLabel(buckets[index], windowKey)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export const TREND_LEGEND = SEVERITY_LINES;
