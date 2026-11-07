import { useMemo } from 'react';
import { Activity, Construction, Flame, Layers, Mountain, TriangleAlert, Users, Waves } from 'lucide-react';
import { MiniBar, Panel } from './hud';
import { countByHazardGroup, summarizePopulationByState } from '../../utils/commandCenter/stateStats';
import census from '../../data/gis/stateCensus2011';
import indiaStates from '../../data/gis/indiaStates';
import { estimateStatePopulations, rankEstimatedStates } from '../../utils/commandCenter/populationEstimate';

const inr = (value) => Number(value).toLocaleString('en-IN');

const GROUP_ICON = {
  landslide: Mountain,
  road: Construction,
  flood: Waves,
  fire: Flame,
  quake: Activity,
  other: TriangleAlert,
};

// All-India view: how the active incidents split by hazard type.
export function TypePanel({ incidents, loading }) {
  const groups = useMemo(() => countByHazardGroup(incidents), [incidents]);
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  return (
    <Panel className="icc-types" title="INCIDENTS BY TYPE" icon={Layers} kicker={loading ? '' : `${total} ACTIVE`}>
      {loading ? <p className="icc-state" role="status">Loading incident reports…</p> : (
        <ul className="icc-type-grid">
          {groups.map((group) => {
            const Icon = GROUP_ICON[group.key] || TriangleAlert;
            return (
              <li key={group.key} className={group.count ? 'icc-type-on' : ''}>
                <Icon size={26} aria-hidden="true" />
                <strong>{group.count}</strong>
                <span>{group.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// All-India view: states ranked by active incidents. A row opens that state.
export function TopStatesPanel({ rows, outside, loading, indexReady, onSelect }) {
  const top = rows.slice(0, 6);
  const maxCount = Math.max(1, ...top.map((row) => row.count));
  return (
    <Panel className="icc-top-states" title="TOP AFFECTED STATES" icon={TriangleAlert} kicker="BY ACTIVE INCIDENTS">
      {loading ? <p className="icc-state" role="status">Loading incident reports…</p> : null}
      {!loading && !indexReady ? <p className="icc-state" role="status">Loading state boundaries…</p> : null}
      {!loading && indexReady && top.length === 0 ? <p className="icc-state">No active incident falls inside a state boundary.</p> : null}
      {!loading && indexReady && top.length > 0 ? (
        <ul className="icc-list icc-rank-list">
          {top.map((row) => (
            <li key={row.code}>
              <button type="button" className="icc-rank-row" onClick={() => onSelect(row.code)} title={`Open ${row.name}`}>
                <span className="icc-rank-name">{row.name}</span>
                <b>{row.count}</b>
              </button>
              <MiniBar value={row.count} max={maxCount} tone={row.topSeverity === 'critical' ? 'red' : row.topSeverity === 'high' ? 'orange' : row.topSeverity === 'medium' ? 'yellow' : 'green'} label={`${row.count} active incidents in ${row.name}`} />
              <small>{row.critical} critical · {row.high} high · {row.medium} medium · {row.low} low</small>
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && indexReady && outside > 0 ? (
        <p className="icc-caption">{outside} active {outside === 1 ? 'record has' : 'records have'} no location inside an Indian state, so {outside === 1 ? 'it is' : 'they are'} not listed here.</p>
      ) : null}
    </Panel>
  );
}

// All-India view: people living in assessed red/orange habitations, by state. A row opens that state.
export function PopulationStatesPanel({ populationFeed, habitations, index, loading, unavailable, onSelect }) {
  const rows = useMemo(() => (index ? summarizePopulationByState(habitations, index) : []), [habitations, index]);
  const top = rows.slice(0, 6);
  const maxPeople = Math.max(1, ...top.map((row) => row.atRisk + row.watch));
  const atRisk = rows.reduce((sum, row) => sum + row.atRisk, 0);
  const national = populationFeed?.data || null;
  const ranking = useMemo(
    () => rankEstimatedStates(national ? estimateStatePopulations(national.value, census) : {}, indiaStates, rows),
    [national, rows],
  );
  const maxEstimate = Math.max(1, ...ranking.map((row) => row.population));
  return (
    <Panel className="icc-pop-states" title="POPULATION AT RISK BY STATE" icon={Users} kicker="HABITATIONS">
      {loading ? <p className="icc-state" role="status">Loading habitation records…</p> : null}
      {!loading && unavailable ? <p className="icc-state icc-state-error" role="status">Habitation records unavailable.</p> : null}
      {!loading && !unavailable && !index ? <p className="icc-state" role="status">Loading state boundaries…</p> : null}
      {!loading && !unavailable && index ? (
        <>
          <div className="icc-summary">
            <strong className="icc-tone-text-red">{inr(atRisk)}</strong>
            <span>people in red / orange zones across India</span>
          </div>
          <ul className="icc-list icc-rank-list">
            {top.map((row) => (
              <li key={row.code}>
                <button type="button" className="icc-rank-row" onClick={() => onSelect(row.code)} title={`Open ${row.name}`}>
                  <span className="icc-rank-name">{row.name}</span>
                  <b>{inr(row.atRisk)}</b>
                </button>
                <MiniBar value={row.atRisk} max={maxPeople} tone="red" label={`${inr(row.atRisk)} people at risk in ${row.name}`} />
                <small>{inr(row.watch)} in yellow zones · {row.habitations} {row.habitations === 1 ? 'habitation' : 'habitations'}</small>
              </li>
            ))}
            {top.length === 0 ? <li className="icc-state">No habitations with a recorded population.</li> : null}
          </ul>
          <h3 className="icc-subhead">All {ranking.length} states and union territories, estimated {national ? national.year : ''}</h3>
          <div className="icc-summary">
            <strong>{national ? inr(national.value) : (populationFeed?.status === 'loading' ? '…' : '—')}</strong>
            <span>{national ? `India's population in ${national.year}, World Bank (live API)` : 'India population unavailable right now (World Bank)'}</span>
          </div>
          {ranking.length > 0 ? (
            <ul className="icc-list icc-rank-list">
              {ranking.map((row) => (
                <li key={row.code}>
                  <button type="button" className="icc-rank-row" onClick={() => onSelect(row.code)} title={`Open ${row.name}`}>
                    <span className="icc-rank-name">{row.name}</span>
                    <b>≈ {inr(row.population)}</b>
                  </button>
                  <MiniBar value={row.population} max={maxEstimate} tone="cyan" label={`About ${inr(row.population)} people in ${row.name}, estimated for ${national.year}`} />
                  <small>{row.atRisk > 0 ? `${inr(row.atRisk)} in SENTRY red/orange habitations (${(row.share * 100).toFixed(2)}%)` : 'No SENTRY red/orange habitations'}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="icc-caption">State figures are estimates: the {national ? national.year : 'latest'} national total spread by each state's 2011 census share, so fast-growing states are under-counted. At-risk counts only habitations registered in SENTRY.</p>
        </>
      ) : null}
    </Panel>
  );
}
