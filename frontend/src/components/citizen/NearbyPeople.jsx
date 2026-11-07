import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Users, X } from 'lucide-react';
import { searchPlaces } from '../../services/placeSearch';
import { useNearbyPeople } from '../../hooks/useNearbyPeople';
import { useCitizenLang } from '../../hooks/useCitizenLang';
import { colorOf, distanceText, labelOf, seenText, sortPeople } from '../../utils/nearbyPeople';
import '../../css/nearby-people.css';

const RADII = [2, 5, 10, 25];
const STATUS_CHOICES = ['sharing', 'need-help', 'can-help', 'safe'];

function PlacePicker({ onPick, onCancel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.trim().length < 3) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setError('');
      try {
        setResults(await searchPlaces(query, controller.signal));
      } catch (searchError) {
        if (searchError.name !== 'AbortError') setError(searchError.message || 'Place search failed.');
      }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  return (
    <div className="np-picker">
      <label className="np-field">
        <span>Type a town, area or landmark</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="For example: Lajpat Nagar, Delhi" autoFocus />
      </label>
      {error ? <p className="np-error" role="alert">{error}</p> : null}
      {results.length ? (
        <ul className="np-results">
          {results.map((place) => (
            <li key={`${place.lat},${place.lng}`}><button type="button" onClick={() => onPick(place)}><MapPin size={20} aria-hidden="true" /> {place.label}</button></li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="np-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

// People nearby: switch it on and you appear to other people who have it on (and to authority), and you see them, on the map and in the
// list below. It is off until the person turns it on, and it goes off when they turn it off or leave the page. No chat: only first
// name, a status and a place rounded to about 100 m are shared.
export default function NearbyPeople({ citizenLocation, onPeople }) {
  const { t } = useCitizenLang();
  const mine = useMemo(() => {
    const lat = citizenLocation?.latitude ?? citizenLocation?.lat;
    const lng = citizenLocation?.longitude ?? citizenLocation?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, label: t('np.mine') } : null;
  }, [citizenLocation, t]);
  const [chosen, setChosen] = useState(null);
  const [picking, setPicking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState('sharing');
  const [radiusKm, setRadiusKm] = useState(5);
  const origin = chosen || mine;
  const { people, mine: mineEntry, error, loaded } = useNearbyPeople({ sharing, lat: origin?.lat, lng: origin?.lng, status, radiusKm });
  const sorted = useMemo(() => sortPeople(people), [people]);
  const needHelp = sorted.filter((person) => person.status === 'need-help').length;

  useEffect(() => { if (onPeople) onPeople(sharing ? people : []); }, [onPeople, people, sharing]);

  return (
    <section className="citizen-card np" aria-labelledby="np-title">
      <div className="citizen-card-header">
        <div>
          <h2 className="citizen-card-title" id="np-title"><Users size={26} aria-hidden="true" /> {t('np.title')}</h2>
          <div className="citizen-card-muted">{t('np.sub')}</div>
        </div>
        <span className="np-count">{sharing && loaded ? `${sorted.length} nearby${needHelp ? ` · ${needHelp} need help` : ''}` : ''}</span>
      </div>

      <p className="np-safety">{t('np.safety')}</p>

      <div className="np-quick" role="group" aria-label="Quick status">
        <button type="button" className="np-sos" disabled={!origin} onClick={() => { setStatus('need-help'); setSharing(true); }}>{t('np.sos')}</button>
        <button type="button" className="np-safe" disabled={!origin} onClick={() => { setStatus('safe'); setSharing(true); }}>{t('np.safe')}</button>
        <a className="np-call" href="tel:112">{t('np.call')}</a>
      </div>
      <p className="np-note">{t('np.quick')}</p>

      <div className="np-row">
        <button type="button" className={`np-switch${sharing ? ' on' : ''}`} role="switch" aria-checked={sharing} disabled={!origin} onClick={() => setSharing((value) => !value)}>
          <i aria-hidden="true" />{sharing ? t('np.on') : t('np.off')}
        </button>
        <label className="np-field">
          <span>{t('np.status')}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_CHOICES.map((key) => <option key={key} value={key}>{t(`st.${key}`)}</option>)}
          </select>
        </label>
        <label className="np-field">
          <span>{t('np.distance')}</span>
          <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
            {RADII.map((km) => <option key={km} value={km}>{t('np.within', { n: km })}</option>)}
          </select>
        </label>
      </div>

      <div className="np-place">
        <MapPin size={22} aria-hidden="true" />
        <span>{origin ? origin.label : t('np.noloc')}</span>
        {chosen ? <button type="button" className="np-ghost" onClick={() => setChosen(null)}><X size={18} aria-hidden="true" /> {t('np.usemine')}</button> : null}
        {!picking ? <button type="button" className="np-ghost" onClick={() => setPicking(true)}><Search size={18} aria-hidden="true" /> {t('np.choose')}</button> : null}
      </div>
      {picking ? <PlacePicker onPick={(place) => { setChosen({ lat: place.lat, lng: place.lng, label: place.label }); setPicking(false); }} onCancel={() => setPicking(false)} /> : null}

      {sharing && mineEntry?.status === 'need-help' ? (
        <p className={`np-answer${mineEntry.response ? ' got' : ''}`} role="status">
          {mineEntry.response === 'on-the-way' ? t('np.ontheway')
            : mineEntry.response === 'noted' ? t('np.noted')
              : t('np.waiting')}
        </p>
      ) : null}
      {error ? <p className="np-error" role="alert">{error}</p> : null}
      {!origin ? <p className="np-note">{t('np.noloc')}</p> : null}
      {!sharing && origin ? <p className="np-note">{t('np.switchon')}</p> : null}
      {sharing && loaded && !sorted.length ? <p className="np-note">{t('np.empty')}</p> : null}
      {sharing && sorted.length ? (
        <ul className="np-list">
          {sorted.map((person) => (
            <li key={person.id} className="np-person" style={{ borderLeftColor: colorOf(person) }}>
              <b>{person.firstName}</b>
              <span className="np-tag" style={{ color: colorOf(person) }}>{person.isAuthority ? labelOf(person) : t(`st.${person.status}`)}</span>
              <span className="np-meta">{distanceText(person.distanceKm)} · {seenText(person.updatedAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
