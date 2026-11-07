import api from "./api";

async function request(path, config) {
  const response = await api.request({ url: path, ...config });
  if (!response.data?.success) throw new Error(response.data?.message || "The nearby service returned an invalid response.");
  return response.data;
}

// People who chose to share their place with people nearby (see backend/services/nearbyPeople.js).
export const nearbyApi = {
  share: (lat, lng, status) => request("/nearby/me", { method: "PUT", data: { lat, lng, status } }),
  stop: () => request("/nearby/me", { method: "DELETE" }),
  respond: (id, value) => request(`/nearby/${encodeURIComponent(id)}/response`, { method: "PATCH", data: { value } }),
  list: (params = {}) => request("/nearby", { params }),
};

// Closing the page stops sharing even when the browser is going away (a normal request could be cut off).
export function stopSharingOnLeave() {
  try {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;
    const base = String(api.defaults?.baseURL || "").replace(/\/$/, "");
    void fetch(`${base}/nearby/me`, { method: "DELETE", keepalive: true, headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // nothing more can be done while the page is closing
  }
}
