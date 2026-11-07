// Official NDMA SACHET alerts, fetched through the SENTRY backend (which caches and spaces out the rate-limited feeds).

import api from '../api';

// Without a state code this is the All India feed; with one (for example 'IN-KL') it is that state's own feed.
// States NDMA publishes no feed for come back with `supported: false` and no alerts.
export async function fetchSachetAlerts(stateCode) {
  const response = await api.get('/feeds/sachet', stateCode ? { params: { state: stateCode } } : undefined);
  const data = response.data?.data;
  if (!data || !Array.isArray(data.alerts)) throw new Error('SACHET response was not a list.');
  return data;
}
