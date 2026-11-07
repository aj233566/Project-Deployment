import { deriveRoadStatusFromIncidents } from './roadStatusFromIncidents.js';
export function selectRoadStatusRows({ mapRows = [], incidentRows = [] } = {}) {
  if (Array.isArray(mapRows) && mapRows.length > 0) return mapRows;
  return deriveRoadStatusFromIncidents(incidentRows);
}
export default selectRoadStatusRows;
