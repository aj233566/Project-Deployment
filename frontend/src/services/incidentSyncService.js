import { getPendingIncidents, markIncidentAsSynced, setIncidentClientReportId } from "./db";
import { submitIncident } from "./api";
let syncPromise = null;
function makeClientReportId() {
  return globalThis.crypto?.randomUUID?.()
    || `report_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
function createReportFormData(incident, clientReportId) {
  const evidence = incident.evidence?.file;
  if (!evidence || typeof evidence.arrayBuffer !== "function") {
    throw new Error("Evidence file is unavailable in the offline report queue.");
  }
  if (!Number.isFinite(Number(incident.latitude)) || !Number.isFinite(Number(incident.longitude))) {
    throw new Error("Valid coordinates are required before an offline report can sync.");
  }
  const formData = new FormData();
  formData.append("clientReportId", clientReportId);
  formData.append("type", String(incident.type || incident.title || "").toLowerCase().replace(/\s+/g, "_"));
  formData.append("hazardSubtype", incident.hazardSubtype || "");
  formData.append("description", String(incident.description || "").trim());
  formData.append("severity", String(incident.severity || "moderate").toLowerCase());
  formData.append("latitude", String(incident.latitude));
  formData.append("longitude", String(incident.longitude));
  if (evidence.type.startsWith("image/")) formData.append("images", evidence, evidence.name || "incident-evidence");
  else if (evidence.type.startsWith("video/")) formData.append("videos", evidence, evidence.name || "incident-evidence");
  else throw new Error("Only photo or video evidence can be synchronized.");
  return formData;
}
async function performSync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, reports: [] };
  }
  if (typeof window !== "undefined" && !(window.sessionStorage.getItem("token") || window.localStorage.getItem("token"))) {
    return { synced: 0, failed: 0, reports: [] };
  }
  const pending = await getPendingIncidents();
  const reports = [];
  for (const incident of pending) {
    let clientReportId = incident.clientReportId;
    if (!clientReportId) {
      clientReportId = makeClientReportId();
      await setIncidentClientReportId(incident.id, clientReportId);
    }
    try {
      const response = await submitIncident(createReportFormData(incident, clientReportId));
      const serverIncident = response?.data;
      if (!serverIncident?._id) throw new Error("The server did not confirm a stored incident ID.");
      await markIncidentAsSynced(incident.id, serverIncident);
      reports.push({ id: incident.id, clientReportId, status: "synced", serverIncident });
    } catch (error) {
      reports.push({
        id: incident.id,
        clientReportId,
        status: "failed",
        error: error.response?.data?.message || error.message || "Incident synchronization failed."
      });
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("incident-sync-complete", { detail: { reports } }));
    const confirmedReports = reports.filter((item) => item.status === "synced");
    if (confirmedReports.length > 0) {
      try {
        window.localStorage.setItem("sentry:citizen-report-synced", JSON.stringify({
          reportIds: confirmedReports.map((item) => item.clientReportId),
          syncedAt: Date.now(),
        }));
      } catch {
        // The authority dashboard also refreshes periodically if storage is unavailable.
      }
    }
  }
  return {
    synced: reports.filter((item) => item.status === "synced").length,
    failed: reports.filter((item) => item.status === "failed").length,
    reports
  };
}
export function syncPendingIncidents() {
  if (!syncPromise) {
    syncPromise = performSync().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}
