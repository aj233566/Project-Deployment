import axios from "axios";
import { clearSession, shouldRedirectToLogin, getToken, getStoredUser } from "../context/session";
import { getLoginPath } from "../utils/loginRouting";
const configuredApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const apiBaseUrl = /\/api$/i.test(configuredApiUrl)
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;
export { apiBaseUrl };
export function logoutAndRedirect() {
  if (typeof window === "undefined") return;
  const token = getToken();
  if (token) {
    void fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  }
  clearSession();
  window.location.replace("/login");
}
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (shouldRedirectToLogin(status, window.location.pathname)) {
      const loginPath = getLoginPath(window.location.pathname, getStoredUser());
      clearSession();
      window.location.assign(loginPath);
    }
    return Promise.reject(error);
  },
);
export const submitIncident = async (incidentData) => {
  const response = await api.post("/incidents", incidentData);
  return response.data;
};
export const getIncidents = async () => {
  const response = await api.get("/incidents");
  return response.data;
};
export const getIncidentById = async (id) => {
  const response = await api.get(`/incidents/${id}`);
  return response.data;
};
export const getIncidentEvidence = async (fileId) => {
  const response = await api.get(`/incidents/evidence/${encodeURIComponent(fileId)}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};
export const updateIncidentStatus = async (id, status) => {
  const response = await api.patch(`/incidents/${id}`, {
    status,
  });
  return response.data;
};
export const alertApi = {
  getAlerts: async () => {
    const response = await api.get("/alerts");
    return response.data;
  },
  getAlertById: async (id) => {
    const response =
      await api.get(`/alerts/${id}`);
    return response.data;
  },
  updateAlertStatus: async (id, status) => {
    const response =
      await api.patch(
        `/alerts/${id}/status`,
        { status }
      );
    return response.data;
  },
};
export const notificationApi = {
  getNotifications: async () => {
    const response = await api.get("/notifications");
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  },
  sendBroadcast: async (payload) => {
    const response = await api.post("/notifications/broadcast", payload);
    return response.data;
  },
};
export const emergencyApi = {
  getPrioritisedAreas: async () => {
    const response = await api.get("/emergency-priority");
    return response.data;
  },
  dispatchTeam: async (areaId, unitName) => {
    const response = await api.post(
      `/emergency-priority/${areaId}/dispatch`,
      {
        unitName,
      }
    );
    return response.data;
  },
};
export const resourcesApi = {
  getResources: async () => {
    const response = await api.get(
      "/resources"
    );
    return response.data;
  },
  createResource: async (payload) => {
    const response = await api.post(
      "/resources",
      payload
    );
    return response.data;
  },
  updateResource: async (id, payload) => {
    const response = await api.patch(
      `/resources/${id}`,
      payload
    );
    return response.data;
  }
};
export default api;
