import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { saveIncident } from "../services/db";
import { syncPendingIncidents } from "../services/incidentSyncService";
import "../css/CitizenIncidents.css";
function ReportIncident() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [incidentType, setIncidentType] = useState(routeLocation.state?.incidentType || "");
  const [hazardSubtype, setHazardSubtype] = useState(routeLocation.state?.hazardSubtype || "");
  const [description, setDescription] = useState(routeLocation.state?.description || "");
  const [severity, setSeverity] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [location, setLocation] = useState(routeLocation.state?.location || null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        });
        setMessage("Location captured successfully.");
      },
      () => {
        setMessage("Unable to get your location.");
      },
    );
  };
  const handleEvidenceChange = (event) => {
    const file = event.target.files?.[0] || null;
    setEvidence(file);
    if (file) {
      setMessage(`Evidence selected: ${file.name}`);
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!incidentType || !hazardSubtype || !description || !severity || !dateTime) {
      setMessage("Please fill all required fields.");
      return;
    }
    if (!evidence) {
      setMessage("Photo or video evidence is required before submitting.");
      return;
    }
    if (!location) {
      setMessage("Please capture your current location before submitting.");
      return;
    }
    setIsSubmitting(true);
    const clientReportId = globalThis.crypto?.randomUUID?.()
      || `report_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newIncident = {
      id: Date.now(),
      clientReportId,
      type: incidentType,
      title: incidentType,
      hazardSubtype,
      description,
      severity,
      location: `${location.latitude}, ${location.longitude}`,
      latitude: location.latitude,
      longitude: location.longitude,
      locationTimestamp: location.timestamp,
      time: dateTime,
      status: "Submitted",
      syncStatus: "Pending Sync",
      evidence: {
        name: evidence.name,
        type: evidence.type,
        size: evidence.size,
        file: evidence,
      },
    };
    try {
      await saveIncident(newIncident);
      if (navigator.onLine) {
        try {
          const result = await syncPendingIncidents();
          const thisReport = result.reports.find((item) => item.clientReportId === clientReportId);
          setMessage(thisReport?.status === "synced"
            ? "Incident and evidence submitted. Authority review and verification are pending."
            : `Incident and evidence are saved on this device; synchronization is pending${thisReport?.error ? `: ${thisReport.error}` : "."}`);
        } catch (syncError) {
          console.error("Incident remains queued after a synchronization error:", syncError);
          setMessage(`Incident and evidence are saved on this device; synchronization is pending: ${syncError.message}`);
        }
      } else {
        setMessage("Incident and evidence are saved on this device. Synchronization will retry when the connection returns.");
      }
      setTimeout(() => {
        navigate("/citizen/incidents");
      }, 1000);
    } catch (error) {
      console.error("Error saving incident:", error);
      setMessage("Unable to save incident. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="container py-4">
      <div className="mb-4">
        <button
          type="button"
          className="btn btn-outline-light mb-3"
          onClick={() => navigate("/dashboard/citizen")}
        >
          ← Back
        </button>

        <h1>Report Incident</h1>

        <p>
          Report a disaster or emergency situation with location and evidence.
        </p>
      </div>
      <div className="card p-4">
        <h3 className="mb-4">Incident Information</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="incident-type">Incident Type</label>

            <select
              id="incident-type"
              className="form-select"
              value={incidentType}
              onChange={(event) => setIncidentType(event.target.value)}
              required
            >
              <option value="">Select incident type</option>

              <option value="slope_crack">Slope Crack</option>

              <option value="landslide">Landslide</option>

              <option value="slope_movement">Slope Movement</option>

              <option value="road_blockage">Road Blockage</option>

              <option value="flash_flood">Flash Flood</option>

              <option value="infrastructure_damage">
                Infrastructure Damage
              </option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="hazard-subtype">Hazard type</label>
            <select
              id="hazard-subtype"
              className="form-select"
              value={hazardSubtype}
              onChange={(event) => setHazardSubtype(event.target.value)}
              required
            >
              <option value="">Select hazard type</option>
              <option value="landslide">Landslide</option>
              <option value="flood">Flood</option>
              <option value="earthquake">Earthquake</option>
              <option value="erosion">Erosion</option>
              <option value="cloudburst">Cloudburst</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="incident-description">Description</label>

            <textarea
              id="incident-description"
              className="form-control"
              rows="4"
              placeholder="Describe what happened..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="incident-severity">Severity</label>

            <select
              id="incident-severity"
              className="form-select"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              required
            >
              <option value="">Select severity</option>

              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Location</label>

            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={getLocation}
            >
              📍 Use Current Location
            </button>

            {location && (
              <small className="text-success d-block mt-2">
                Location captured successfully.
                <br />
                Latitude: {location.latitude}
                <br />
                Longitude: {location.longitude}
              </small>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="incident-evidence">Photo / Video Evidence</label>

            <input
              id="incident-evidence"
              type="file"
              className="form-control"
              accept="image/*,video/*"
              onChange={handleEvidenceChange}
              required
            />

            {evidence && (
              <small className="text-success d-block mt-2">
                Evidence selected: {evidence.name}
                <br />
                Type: {evidence.type}
                <br />
                Size: {(evidence.size / 1024 / 1024).toFixed(2)} MB
              </small>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="incident-time">Date & Time</label>

            <input
              id="incident-time"
              type="datetime-local"
              className="form-control"
              value={dateTime}
              onChange={(event) => setDateTime(event.target.value)}
              required
            />
          </div>

          {message && <div className="alert alert-info">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving Incident..." : "Submit Incident"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default ReportIncident;
