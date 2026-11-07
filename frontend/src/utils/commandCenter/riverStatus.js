// River discharge trend from the Open-Meteo flood API (GloFAS model, m3/s).
// This is a modelled estimate for situational awareness; it is not a gauge reading and has no
// official danger level, so the status only describes direction and size of change.

const MIN_MEANINGFUL_FLOW = 5;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function percentChange(from, to) {
  if (!finite(from) || !finite(to)) return null;
  if (from <= 0) return to > 0 ? 100 : 0;
  return ((to - from) / from) * 100;
}

export function analyseRiverSeries(dates, values, todayIso) {
  const series = (Array.isArray(dates) ? dates : []).map((date, index) => ({
    date,
    value: finite(values?.[index]) ? values[index] : null,
    future: date > todayIso,
  }));
  const todayIndex = series.findIndex((point) => point.date === todayIso);
  const today = todayIndex >= 0 ? series[todayIndex].value : null;
  if (!finite(today) || today < MIN_MEANINGFUL_FLOW) {
    return { status: 'unavailable', tone: 'muted', label: 'No usable flow estimate', series, today };
  }

  const past = series.slice(0, todayIndex).filter((point) => finite(point.value));
  const future = series.slice(todayIndex + 1).filter((point) => finite(point.value));
  const threeDaysAgo = series[todayIndex - 3]?.value ?? null;
  const yesterday = series[todayIndex - 1]?.value ?? null;
  const change3d = percentChange(threeDaysAgo, today);
  const changeDay = percentChange(yesterday, today);
  const forecastPeak = future.reduce((best, point) => (!best || point.value > best.value ? point : best), null);
  const pastPeak = [...past, { date: todayIso, value: today }]
    .reduce((best, point) => (!best || point.value > best.value ? point : best), null);

  let status = 'steady';
  if ((change3d ?? 0) >= 25 || (forecastPeak && forecastPeak.value >= today * 1.5)) status = 'rising-fast';
  else if ((change3d ?? 0) >= 10 || (forecastPeak && forecastPeak.value >= today * 1.2)) status = 'rising';
  else if ((change3d ?? 0) <= -10) status = 'falling';

  const meta = {
    'rising-fast': { tone: 'orange', label: 'Rising fast' },
    rising: { tone: 'yellow', label: 'Rising' },
    steady: { tone: 'green', label: 'Steady' },
    falling: { tone: 'blue', label: 'Falling' },
  }[status];

  return {
    status,
    tone: meta.tone,
    label: meta.label,
    today,
    changeDay,
    change3d,
    forecastPeak,
    pastPeak,
    percentOfPeak: pastPeak && pastPeak.value > 0 ? (today / pastPeak.value) * 100 : null,
    series,
  };
}

export function formatDischarge(value) {
  if (!finite(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}
