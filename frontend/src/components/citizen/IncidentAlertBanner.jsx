import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { sentryApi } from '../../services/sentryApi';
import { useCitizenLang } from '../../hooks/useCitizenLang';
import { newNearbyIncidents, seriousIncidentIds } from '../../utils/incidentAlerts';
import '../../css/incident-alert.css';

const POLL_MS = 30000;

function beep() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 740;
    gain.gain.value = 0.07;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.3);
    oscillator.onended = () => { void audio.close(); };
  } catch {
    // the browser does not allow sound yet; the banner still shows
  }
}

// A banner at the top of the citizen page when a new Critical or High incident appears within 100 km of the person while the page is
// open. The incidents that are already there when the page opens do not trigger it.
export default function IncidentAlertBanner({ citizenLocation }) {
  const { t } = useCitizenLang();
  const origin = useMemo(() => {
    const lat = citizenLocation?.latitude ?? citizenLocation?.lat;
    const lng = citizenLocation?.longitude ?? citizenLocation?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [citizenLocation]);
  const seen = useRef(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!origin) return undefined;
    let alive = true;
    const look = async () => {
      try {
        const response = await sentryApi.getActiveIncidents();
        if (!alive) return;
        const incidents = Array.isArray(response.data) ? response.data : [];
        const fresh = newNearbyIncidents(incidents, seen.current, origin);
        seen.current = seriousIncidentIds(incidents);
        if (fresh.length) {
          setAlerts((current) => [...fresh, ...current.filter((item) => !fresh.some((one) => one.id === item.id))].slice(0, 5));
          beep();
        }
      } catch {
        // the next look tries again
      }
    };
    const first = window.setTimeout(() => { void look(); }, 0);
    const timer = window.setInterval(() => { if (!document.hidden) void look(); }, POLL_MS);
    return () => { alive = false; window.clearTimeout(first); window.clearInterval(timer); };
  }, [origin]);

  if (!alerts.length) return null;
  const top = alerts[0];
  return (
    <div className="ia" role="alert">
      <BellRing size={28} aria-hidden="true" />
      <div className="ia-text">
        <strong>{t('alert.title', { severity: top.severity.toUpperCase() })}</strong>
        <span>{t('alert.body', { type: top.type, km: top.km })}{top.place ? ` · ${top.place}` : ''}</span>
        {alerts.length > 1 ? <span>{t('alert.more', { n: alerts.length - 1 })}</span> : null}
      </div>
      <a className="ia-map" href="#citizen-map">{t('alert.map')}</a>
      <button type="button" className="ia-close" onClick={() => setAlerts([])} aria-label={t('alert.dismiss')}><X size={22} aria-hidden="true" /></button>
    </div>
  );
}
