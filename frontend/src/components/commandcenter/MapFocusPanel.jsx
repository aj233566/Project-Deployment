import { useState } from 'react';
import { FOCUS_PRESETS } from '../../utils/commandCenter/mapFocus';

// Right-hand "Map focus" panel, the same presets as the Live Map's Controls panel, for the 3D maps.
export default function MapFocusPanel({ activeId, onSelect, onClear }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="icc-focus" aria-label="Map focus">
      <button type="button" className="icc-focus-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>MAP FOCUS</span><span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <>
          <p className="icc-focus-note">Changes which layers are drawn. It does not filter or change any record.</p>
          <div className="icc-focus-list" role="group" aria-label="Choose a map view">
            {FOCUS_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className={activeId === preset.id ? 'active' : ''} aria-pressed={activeId === preset.id} onClick={() => onSelect(preset.id)} title={preset.description}>
                <b>{preset.label}</b>
                <span>{preset.description}</span>
              </button>
            ))}
            <button type="button" className={activeId === null ? 'active' : ''} aria-pressed={activeId === null} onClick={onClear}>
              <b>All layers</b>
              <span>Show everything again.</span>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
