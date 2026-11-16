import { useMemo, useState } from "react";
import {
  Flame,
  Layers,
  Table as TableIcon,
  Map as MapIcon,
  CheckCircle2,
  Send,
  ShieldAlert,
  Users,
  Route,
} from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import { getStoredUser } from "../../context/session";
import PriorityQueue from "./PriorityQueue";
import ResponseTable from "./ResponseTable";
import ResourceStatus from "./ResourceStatus";
import Modal from "../common/Modal";
import GisCommandCenter from "../gis/GisCommandCenter";
import { emergencyApi } from "../../services/api";
const ADMIN_DISPATCH_UNITS = [
  { value: "NDRF Quick Response Team Bravo (12 Bn)", label: "NDRF Quick Response Team Bravo (12 Bn)" },
  { value: "SDRF Heavy Debris Clearing Unit 3", label: "SDRF Heavy Debris Clearing Unit 3" },
  { value: "Advanced Life Support Ambulance Unit 08", label: "ALS Ambulance Mobile Team 08" },
  { value: "BRO Heavy Earthmover Taskforce", label: "BRO Heavy Earthmover Taskforce (Swastik)" },
  { value: "Field Trauma Emergency Medical Squad", label: "Field Trauma Emergency Medical Squad" },
];
export const EmergencyPriority = () => {
  const {
    emergencyAreas = [],
    dispatchEmergencyUnit,
    completeEmergencyDispatch,
    loadEmergencyAreas,
    resources = [],
    resourcesLoading,
    resourcesError,
  } = useAlerts();
  const currentUser = getStoredUser();
  const isAuthority = currentUser?.role === "authority";
  const canManageAreas = isAuthority && currentUser?.authorityStatus === "verified";
  const dispatchableResources = resources.filter((resource) =>
    typeof resource?.name === "string"
    && resource.name.trim()
    && Number.isFinite(resource.available)
    && resource.available > 0
    && resource.status !== "Unavailable"
  );
  const [activeView, setActiveView] = useState("board");
  const [dispatchArea, setDispatchArea] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(
    isAuthority ? "" : ADMIN_DISPATCH_UNITS[0].value,
  );
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [completingAreaId, setCompletingAreaId] = useState(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [manageAreas, setManageAreas] = useState(false);
  const [areaDraft, setAreaDraft] = useState(null);
  const [areaSaving, setAreaSaving] = useState(false);
  const [areaError, setAreaError] = useState("");
  const gisIncidents = useMemo(() => emergencyAreas.map((area) => ({
    ...area,
    location: { latitude: area.latitude, longitude: area.longitude, address: area.address || area.location },
    status: area.incidentStatus || "verified",
  })), [emergencyAreas]);
  const p1Count = emergencyAreas.filter(
    (area) => area.priorityQueue === "Priority 1",
  ).length;
  const p2Count = emergencyAreas.filter(
    (area) => area.priorityQueue === "Priority 2",
  ).length;
  const p3Count = emergencyAreas.filter(
    (area) => area.priorityQueue === "Priority 3",
  ).length;
  const handleOpenDispatch = (area) => {
    setDispatchArea(area);
    setSelectedUnit(isAuthority ? dispatchableResources[0]?.name || "" : ADMIN_DISPATCH_UNITS[0].value);
    setDispatchSuccess(false);
  };
  const handleConfirmDispatch = async (event) => {
    event.preventDefault();
    if (!dispatchArea || (isAuthority && !dispatchableResources.some((resource) => resource.name === selectedUnit))) {
      return;
    }
    try {
      setDispatchSuccess(false);
      await dispatchEmergencyUnit(
        dispatchArea.id || dispatchArea._id,
        selectedUnit,
      );
      setDispatchSuccess(true);
      setTimeout(() => {
        setDispatchArea(null);
        setDispatchSuccess(false);
      }, 1800);
    } catch (error) {
      console.error("Unable to dispatch emergency unit:", error);
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Emergency dispatch failed. Please try again.",
      );
    }
  };
  const handleCompleteDispatch = async (area) => {
    const areaId = area?.id || area?._id;
    if (!areaId) return;
    setCompletionMessage("");
    setCompletingAreaId(areaId);
    try {
      await completeEmergencyDispatch(areaId);
      setCompletionMessage("Task completed and removed from the active emergency queue. The assigned unit is available again.");
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || "Unable to complete this resource task.");
    } finally {
      setCompletingAreaId(null);
    }
  };
  const openAreaEditor = (area = null) => {
    setAreaError("");
    setAreaDraft(area ? {
      id: area.id || area._id,
      type: area.type || "landslide",
      severity: area.severity || "moderate",
      description: area.description || "",
      address: area.address || (typeof area.location === "string" ? area.location : ""),
      latitude: String(area.latitude ?? ""),
      longitude: String(area.longitude ?? ""),
    } : { type: "landslide", severity: "moderate", description: "", address: "", latitude: "", longitude: "" });
  };
  const saveArea = async (event) => {
    event.preventDefault();
    if (!areaDraft) return;
    setAreaSaving(true);
    setAreaError("");
    const payload = { ...areaDraft, latitude: Number(areaDraft.latitude), longitude: Number(areaDraft.longitude) };
    delete payload.id;
    try {
      if (areaDraft.id) await emergencyApi.updateArea(areaDraft.id, payload);
      else await emergencyApi.createArea(payload);
      setAreaDraft(null);
      await loadEmergencyAreas();
    } catch (error) {
      setAreaError(error?.response?.data?.message || error.message || "Unable to save emergency area.");
    } finally {
      setAreaSaving(false);
    }
  };
  const deleteArea = async (area) => {
    if (!window.confirm(`Delete the emergency area at ${area.location || "this location"}?`)) return;
    setAreaError("");
    try {
      await emergencyApi.deleteArea(area.id || area._id);
      await loadEmergencyAreas();
    } catch (error) {
      setAreaError(error?.response?.data?.message || error.message || "Unable to delete emergency area.");
    }
  };
  return (
    <div className="container-fluid p-0 emergency-priority-container">
      {completionMessage ? <div className="alert alert-success" role="status">{completionMessage}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--critical)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Priority 1 Queue</span>

              <Flame size={16} color="var(--critical)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--critical)",
              }}
            >
              {p1Count}
            </div>

            <div className="kpi-metric-sub">
              Highest-priority response review
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--high-risk)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Priority 2 Queue</span>

              <ShieldAlert size={16} color="var(--high-risk)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--high-risk)",
              }}
            >
              {p2Count}
            </div>

            <div className="kpi-metric-sub">Elevated response and road review</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--warning)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Priority 3 Queue</span>

              <Users size={16} color="var(--warning)" />
            </div>

            <div className="kpi-metric-value">{p3Count}</div>

            <div className="kpi-metric-sub">Continuous Ground Monitoring</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--info)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Total Affected Areas</span>

              <Route size={16} color="var(--info)" />
            </div>

            <div className="kpi-metric-value">{emergencyAreas.length}</div>

            <div className="kpi-metric-sub">
              Ranked by Risk + Population + Road + Resource Factors
            </div>
          </div>
        </div>
      </div>


      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h2
            style={{
              fontSize: "1.964rem",
              margin: 0,
            }}
          >
            Emergency Response
          </h2>

          <p
            style={{
              fontSize: "1.226rem",
              color: "var(--text-muted)",
              margin: "2px 0 0",
            }}
          >
            Prioritize affected areas and coordinate emergency response.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {canManageAreas ? <button className="btn-ops btn-ops-sm" type="button" aria-expanded={manageAreas} onClick={() => setManageAreas((open) => !open)}>{manageAreas ? "Close area manager" : "Manage areas"}</button> : null}
          <button
            className={`btn-ops btn-ops-sm ${
              activeView === "board" ? "btn-ops-primary" : ""
            }`}
            onClick={() => setActiveView("board")}
          >
            <Layers size={13} />

            <span>Priority Queues</span>
          </button>

          <button
            className={`btn-ops btn-ops-sm ${
              activeView === "table" ? "btn-ops-primary" : ""
            }`}
            onClick={() => setActiveView("table")}
          >
            <TableIcon size={13} />

            <span>Matrix Table</span>
          </button>

          <button
            className={`btn-ops btn-ops-sm ${
              activeView === "map" ? "btn-ops-primary" : ""
            }`}
            onClick={() => setActiveView("map")}
          >
            <MapIcon size={13} />

            <span>GIS Map</span>
          </button>
        </div>
      </div>

      {manageAreas && canManageAreas ? (
        <section className="ops-panel p-3 mb-3" aria-label="Manage emergency areas">
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
            <div><h3 className="h5 mb-1">Emergency area records</h3><p className="small text-muted-custom mb-0">Add, correct, or remove active areas. Completed tasks leave the active queue automatically.</p></div>
            <button className="btn-ops btn-ops-primary" type="button" onClick={() => openAreaEditor()}>Add emergency area</button>
          </div>
          {areaError ? <div className="alert alert-danger" role="alert">{areaError}</div> : null}
          {emergencyAreas.length ? <div className="table-responsive"><table className="ops-table"><thead><tr><th>Location</th><th>Incident</th><th>Severity</th><th>Actions</th></tr></thead><tbody>{emergencyAreas.map((area) => <tr key={area.id || area._id}><td>{area.location || "Unknown location"}</td><td>{String(area.type || "Incident").replaceAll("_", " ")}</td><td>{area.severity || "Not recorded"}</td><td><div className="d-flex gap-2"><button className="btn-ops btn-ops-sm" type="button" onClick={() => openAreaEditor(area)}>Edit</button><button className="btn-ops btn-ops-sm btn-ops-critical" type="button" onClick={() => deleteArea(area)}>Delete</button></div></td></tr>)}</tbody></table></div> : <p className="text-muted-custom mb-0">No active emergency areas.</p>}
        </section>
      ) : null}


      {activeView === "board" && (
        <>
          <PriorityQueue
            areas={emergencyAreas}
            onDispatch={handleOpenDispatch}
            onComplete={canManageAreas ? handleCompleteDispatch : undefined}
            completingAreaId={completingAreaId}
          />

          <ResourceStatus />
        </>
      )}


      {activeView === "table" && (
        <>
          <ResponseTable
            areas={emergencyAreas}
            onDispatch={handleOpenDispatch}
            onComplete={canManageAreas ? handleCompleteDispatch : undefined}
            completingAreaId={completingAreaId}
          />

          <ResourceStatus />
        </>
      )}


      {activeView === "map" && (
        <div className="ops-panel p-2 emergency-gis-map" style={{ position: "relative", height: "min(78vh, 900px)", minHeight: 520, overflow: "hidden" }}>
          <GisCommandCenter embedded liveIncidents={gisIncidents} initialHudMode="tactical" initialMapStyle="osmdark" />
        </div>
      )}


      <Modal
        isOpen={Boolean(areaDraft)}
        onClose={() => !areaSaving && setAreaDraft(null)}
        title={areaDraft?.id ? "Edit Emergency Area" : "Add Emergency Area"}
      >
        {areaDraft ? <form onSubmit={saveArea}>
          {areaError ? <div className="alert alert-danger" role="alert">{areaError}</div> : null}
          <div className="row g-3">
            <div className="col-12 col-md-6"><label className="form-label">Incident type</label><select className="ops-select" required value={areaDraft.type} onChange={(event) => setAreaDraft({ ...areaDraft, type: event.target.value })}><option value="landslide">Landslide</option><option value="road_blockage">Road blockage</option><option value="flash_flood">Flash flood</option><option value="slope_crack">Slope crack</option><option value="slope_movement">Slope movement</option><option value="infrastructure_damage">Infrastructure damage</option></select></div>
            <div className="col-12 col-md-6"><label className="form-label">Severity</label><select className="ops-select" required value={areaDraft.severity} onChange={(event) => setAreaDraft({ ...areaDraft, severity: event.target.value })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <div className="col-12"><label className="form-label">Location / address</label><input className="ops-input" maxLength={240} value={areaDraft.address} onChange={(event) => setAreaDraft({ ...areaDraft, address: event.target.value })} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Latitude</label><input className="ops-input" type="number" min="-90" max="90" step="any" required value={areaDraft.latitude} onChange={(event) => setAreaDraft({ ...areaDraft, latitude: event.target.value })} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Longitude</label><input className="ops-input" type="number" min="-180" max="180" step="any" required value={areaDraft.longitude} onChange={(event) => setAreaDraft({ ...areaDraft, longitude: event.target.value })} /></div>
            <div className="col-12"><label className="form-label">Incident details</label><textarea className="ops-input" rows={3} required maxLength={3000} value={areaDraft.description} onChange={(event) => setAreaDraft({ ...areaDraft, description: event.target.value })} /></div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3"><button type="button" className="btn-ops" onClick={() => setAreaDraft(null)} disabled={areaSaving}>Cancel</button><button type="submit" className="btn-ops btn-ops-primary" disabled={areaSaving}>{areaSaving ? "Saving…" : "Save area"}</button></div>
        </form> : null}
      </Modal>

      <Modal
        isOpen={Boolean(dispatchArea)}
        onClose={() => setDispatchArea(null)}
        title={`Dispatch Emergency Unit${
          dispatchArea?.location ? ` — ${dispatchArea.location}` : ""
        }`}
      >
        {dispatchSuccess ? (
          <div
            className="text-center py-4"
            style={{
              color: "var(--safe)",
            }}
          >
            <CheckCircle2 size={44} className="mb-2" />

            <h3
              style={{
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              Dispatch Order Transmitted
            </h3>

            <p
              style={{
                color: "var(--text-secondary)",
              }}
            >
              Emergency response team assigned successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmDispatch}>
            <div className="mb-3">
              <span className="eyebrow">TARGET EMERGENCY SECTOR</span>

              <h4
                style={{
                  color: "var(--text-primary)",
                  margin: "2px 0 6px",
                }}
              >
                {dispatchArea?.location || "Unknown Location"}
              </h4>

              <p
                style={{
                  fontSize: "1.259rem",
                  color: "var(--text-muted)",
                }}
              >
                {dispatchArea?.district || "Unknown District"},{" "}
                {dispatchArea?.state || "Unknown State"}
                {" • "}
                Risk Index:{" "}
                <strong>
                  {Number.isFinite(dispatchArea?.riskScore ?? dispatchArea?.risk?.score)
                    ? `${dispatchArea.riskScore ?? dispatchArea.risk.score}/100`
                    : "Unavailable"}
                </strong>
                {" • "}
                Road:{" "}
                <strong>
                  {dispatchArea?.roadStatus ||
                    dispatchArea?.operations?.roadBlockage ||
                    "Unknown"}
                </strong>
              </p>
            </div>

            <div className="broadcast-form-group">
              <label>Select Response Team</label>

              <select
                className="ops-select"
                value={selectedUnit}
                onChange={(event) => setSelectedUnit(event.target.value)}
                disabled={isAuthority && (resourcesLoading || Boolean(resourcesError) || dispatchableResources.length === 0)}
              >
                {isAuthority && resourcesLoading ? <option value="">Loading registered resources…</option> : null}
                {isAuthority && !resourcesLoading && resourcesError ? <option value="">Resource inventory unavailable</option> : null}
                {isAuthority && !resourcesLoading && !resourcesError && dispatchableResources.length === 0 ? <option value="">No available registered resources</option> : null}
                {isAuthority && !resourcesLoading && !resourcesError ? dispatchableResources.map((resource) => (
                  <option key={resource._id || resource.id || resource.name} value={resource.name}>
                    {resource.name} · {resource.available} available
                  </option>
                )) : null}
                {!isAuthority ? ADMIN_DISPATCH_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                )) : null}
              </select>
            </div>

            <div className="broadcast-form-group">
              <label>Tactical Mission Orders</label>

              <textarea
                className="ops-input"
                rows={3}
                defaultValue={`Immediate transit to ${
                  dispatchArea?.location || "target coordinates"
                }. Clear road access, establish relief camp perimeter, and assist local evacuation.`}
              />
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn-ops"
                onClick={() => setDispatchArea(null)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-ops btn-ops-critical"
                disabled={!selectedUnit || (isAuthority && (resourcesLoading || Boolean(resourcesError) || !dispatchableResources.some((resource) => resource.name === selectedUnit)))}
              >
                <Send size={13} />

                <span>Confirm Deployment</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default EmergencyPriority;
