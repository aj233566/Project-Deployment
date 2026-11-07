import { usePresenceBeat } from '../hooks/usePresence';

// Mounted once for the whole app: keeps this browser counted as "online" while any page is showing. Renders nothing.
export default function PresenceBeat() {
  usePresenceBeat();
  return null;
}
