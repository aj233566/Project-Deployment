import { useEffect, useMemo, useState } from 'react';
import { Navigation, ShieldCheck } from 'lucide-react';
import { sentryApi } from '../../services/sentryApi';
import { fetchDriveEta } from '../../services/routeEta';
import { useCitizenLang } from '../../hooks/useCitizenLang';
import { directionsUrl, nearestSites } from '../../utils/safePlaces';
import '../../css/safe-places.css';

// The three closest open relocation sites, with free places, road access, the driving time by road (when the road service answers) and
// a directions link.
export default function SafePlaces({ citizenLocation }) {
  const { t } = useCitizenLang();
  const from = useMemo(() => {
    const lat = citizenLocation?.latitude ?? citizenLocation?.lat;
    const lng = citizenLocation?.longitude ?? citizenLocation?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [citizenLocation]);
  const [sites, setSites] = useState(null);
  const [error, setError] = useState('');
  const [etas, setEtas] = useState({});

  useEffect(() => {
    let alive = true;
    sentryApi.getRelocationSites()
      .then((response) => { if (alive) setSites(Array.isArray(response.data) ? response.data : []); })
      .catch((loadError) => { if (alive) setError(loadError.message || 'Could not load safe places.'); });
    return () => { alive = false; };
  }, []);

  const nearest = useMemo(() => nearestSites(sites, from, 3), [sites, from]);

  // The road time for each of the three, one request each, once per set of places. A failure just leaves the straight-line distance.
  useEffect(() => {
    if (!from || !nearest.length) return undefined;
    const controller = new AbortController();
    Promise.all(nearest.map((place) => fetchDriveEta(from, place, { signal: controller.signal }))).then((results) => {
      if (controller.signal.aborted) return;
      setEtas(Object.fromEntries(nearest.map((place, index) => [place.id, results[index]])));
    });
    return () => controller.abort();
  }, [from, nearest]);

  return (
    <section className="citizen-card sp" aria-labelledby="sp-title">
      <div className="citizen-card-header">
        <div>
          <h2 className="citizen-card-title" id="sp-title"><ShieldCheck size={26} aria-hidden="true" /> {t('sp.title')}</h2>
          <div className="citizen-card-muted">{t('sp.sub')}</div>
        </div>
      </div>
      {error ? <p className="sp-note" role="alert">{error}</p> : null}
      {!from ? <p className="sp-note">{t('sp.noloc')}</p> : null}
      {from && sites === null && !error ? <p className="sp-note" role="status">{t('sp.loading')}</p> : null}
      {from && sites && !nearest.length ? <p className="sp-note">{t('sp.none')}</p> : null}
      {nearest.length ? (
        <ol className="sp-list">
          {nearest.map((place, index) => {
            const eta = etas[place.id];
            return (
              <li key={place.id} className="sp-item">
                <div className="sp-main">
                  <b>{index + 1}. {place.name}</b>
                  <span className="sp-meta">
                    {eta ? t('sp.road', { min: eta.minutes, km: eta.km }) : t('sp.direct', { km: place.km })}
                    {' · '}
                    {place.free === null ? t('sp.nospace') : t('sp.free', { n: place.free })}
                  </span>
                  <span className={`sp-road sp-road-${place.road.toLowerCase()}`}>{t(`road.${place.road}`)}</span>
                  {place.facilities.length ? <span className="sp-meta">{place.facilities.join(', ')}</span> : null}
                </div>
                <a className="sp-go" href={directionsUrl(from, place)} target="_blank" rel="noopener noreferrer"><Navigation size={20} aria-hidden="true" /> {t('sp.go')}</a>
              </li>
            );
          })}
        </ol>
      ) : null}
      <p className="sp-note">{t('sp.warn')}</p>
    </section>
  );
}
