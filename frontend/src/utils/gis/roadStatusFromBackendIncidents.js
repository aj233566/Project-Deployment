import { normalizeBackendIncidents } from './incidentNormalizer.js';
import { deriveRoadStatusFromIncidents } from './roadStatusFromIncidents.js';
export function deriveRoadStatusFromBackendIncidents(rawIncidents = []) {
  const incidents = Array.isArray(rawIncidents)
    ? rawIncidents
    : Array.isArray(rawIncidents?.data)
      ? rawIncidents.data
      : [];
  return deriveRoadStatusFromIncidents(normalizeBackendIncidents(incidents));
}
export default deriveRoadStatusFromBackendIncidents;
