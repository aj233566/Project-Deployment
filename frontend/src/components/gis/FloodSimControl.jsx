import { useEffect, useRef, useState } from 'react';
import { computeFloodState } from '../../data/gis/floodSim';
export default function FloodSimControl({ active, onToggleActive, level, onLevelChange }) {
  const [playing, setPlaying] = useState(false);
  const levelRef = useRef(level);
  const timer = useRef(null);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    if (!active || !playing) {
      clearInterval(timer.current);
      return undefined;
    }
    timer.current = setInterval(() => {
      const next = Math.min(1, levelRef.current + 0.012);
      onLevelChange(next);
      if (next >= 1) setPlaying(false);
    }, 120);                      
    return () => clearInterval(timer.current);
  }, [active, playing, onLevelChange]);
  const start = () => {
    onToggleActive(true);
    if (level >= 1) onLevelChange(0);
    setPlaying(true);
  };
  const stop = () => {
    setPlaying(false);
    onToggleActive(false);
    onLevelChange(0);
  };
  const s = computeFloodState(level);
  if (!active) {
    return (
      <div className="gis-flood-panel collapsed">
        <button className="gis-flood-start" onClick={start} title="Run a real-time Brahmaputra flood simulation">
          <span className="gis-flood-dot" />
          START FLOOD SIM · ASSAM
        </button>
      </div>
    );
  }
  return (
    <div className="gis-flood-panel">
      <div className="gis-flood-head">
        <span className="gis-flood-live" />
        <span className="gis-flood-title">FLOOD SIM · ASSAM · BRAHMAPUTRA</span>
        <span className="gis-flood-clock">T+{s.hours}h</span>
        <button className="gis-flood-x" onClick={stop} title="Stop & reset">✕</button>
      </div>

      <div className="gis-flood-body">
        <div className="gis-flood-row">
          <button
            className={`gis-flood-btn ${playing ? 'is-pause' : 'is-play'}`}
            onClick={() => setPlaying((p) => !p)}
          >
            <span className={`gis-flood-ico ${playing ? 'pause' : 'play'}`} />
            {playing ? 'PAUSE' : 'PLAY'}
          </button>
          <input
            className="gis-flood-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={level}
            onChange={(e) => {
              setPlaying(false);
              onLevelChange(parseFloat(e.target.value));
            }}
          />
        </div>

        <div className="gis-flood-stats">
          <div className="gis-flood-stat">
            <span className="gis-flood-k">WATER LEVEL</span>
            <span className="gis-flood-v water">{Math.round(level * 100)}%</span>
          </div>
          <div className="gis-flood-stat">
            <span className="gis-flood-k">VILLAGES FLOODED</span>
            <span className="gis-flood-v crit">{s.stats.floodedCount}/{s.stats.totalVillages}</span>
          </div>
          <div className="gis-flood-stat">
            <span className="gis-flood-k">CROSSINGS CUT</span>
            <span className="gis-flood-v crit">{s.stats.cutCount}/{s.stats.totalRoads}</span>
          </div>
          <div className="gis-flood-stat">
            <span className="gis-flood-k">PEOPLE AFFECTED</span>
            <span className="gis-flood-v warn">~{s.stats.peopleAffected.toLocaleString()}k</span>
          </div>
        </div>
      </div>
    </div>
  );
}
