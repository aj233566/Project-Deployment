import api from "./api";
async function request(path, config) {
  const response = await api.request({ url: path, ...config });
  if (!response.data?.success) {
    throw new Error(response.data?.message || "The SENTRY service returned an invalid response.");
  }
  return response.data;
}
export const sentryApi = {
  getHabitations: (params = {}) => request("/habitations", { params }),
  getHabitation: (id) => request(`/habitations/${id}`),
  createHabitation: (data) => request("/habitations", {
    method: "POST",
    data,
  }),
  updateHabitation: (id, data) => request(`/habitations/${id}`, {
    method: "PATCH",
    data,
  }),
  getRelocationSites: (params = {}) => request("/relocation-sites", { params }),
  getRelocationSite: (id) => request(`/relocation-sites/${id}`),
  createRelocationSite: (data) => request("/relocation-sites", {
    method: "POST",
    data,
  }),
  getAffectedAreas: () => request("/affected-areas"),
  createAffectedArea: (data) => request("/affected-areas", { method: "POST", data }),
  updateAffectedArea: (id, data) => request(`/affected-areas/${id}`, { method: "PATCH", data }),
  getRedZones: () => request("/red-zones"),
  getRedZone: (id) => request(`/red-zones/${id}`),
  recalculateRedZone: (habitationId) => request("/red-zones/recalculate", {
    method: "POST",
    data: { habitationId },
  }),
  getRelocationPriorities: () => request("/relocation-priority"),
  getRelocationPriority: (habitationId) => request(`/relocation-priority/${habitationId}`),
  getActiveIncidents: () => request("/incidents/active"),
  getCurrentWeather: (latitude, longitude) => request("/weather/current", {
    params: { latitude, longitude },
    timeout: 15000,
  }),
  createTargetedAlert: (payload) => request("/alerts/targeted", {
    method: "POST",
    data: payload,
  }),
  getAlerts: () => request("/alerts"),
};
