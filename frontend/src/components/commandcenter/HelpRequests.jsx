import { useEffect, useMemo, useRef, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { nearbyApi } from '../../services/nearbyApi';
import { seenText } from '../../utils/nearbyPeople';
import { newHelpRequests } from '../../utils/helpRequests';

// A short beep for a new request. Browsers only allow sound after the person has used the page, so a failure is ignored.
function beep() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.35);
    oscillator.onended = () => { void audio.close(); };
  } catch {
    // no sound available
  }
}

// For authority and admin: people who switched sharing on with "needs help". Shows who, where (rounded place) and how long ago, plays
// a beep when a new person appears, and lets the authority answer, which the person then sees on their own screen.
export default function HelpRequests({ people, onChanged }) {
  const requests = useMemo(() => (Array.isArray(people) ? people.filter((person) => person.status === 'need-help' && !person.isAuthority) : []), [people]);
  const seen = useRef(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fresh = newHelpRequests(requests, seen.current);
    seen.current = new Set(requests.map((person) => person.id));
    if (fresh.length) beep();
  }, [requests]);

  if (!requests.length) return null;

  const answer = async (id, value) => {
    setBusy(id);
    setError('');
    try {
      await nearbyApi.respond(id, value);
      if (onChanged) await onChanged();
    } catch (answerError) {
      setError(answerError.response?.data?.message || answerError.message || 'Could not send the answer.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="icc-help" role="alert" aria-label="People asking for help">
      <h2><LifeBuoy size={24} aria-hidden="true" /> {requests.length} {requests.length === 1 ? 'PERSON NEEDS' : 'PEOPLE NEED'} HELP</h2>
      <ul>
        {requests.map((person) => (
          <li key={person.id}>
            <b>{person.firstName}</b>
            <span>{person.lat.toFixed(3)}, {person.lng.toFixed(3)} · {seenText(person.updatedAt)}</span>
            {person.response ? <em>{person.response === 'on-the-way' ? 'Answered: help on the way' : 'Answered: noted'}</em> : null}
            <span className="icc-help-actions">
              <button type="button" disabled={busy === person.id || person.response === 'on-the-way'} onClick={() => answer(person.id, 'on-the-way')}>Help is on the way</button>
              <button type="button" disabled={busy === person.id || Boolean(person.response)} onClick={() => answer(person.id, 'noted')}>Noted</button>
            </span>
          </li>
        ))}
      </ul>
      {error ? <p className="icc-help-error">{error}</p> : null}
    </section>
  );
}
