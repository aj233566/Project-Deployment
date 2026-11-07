import { useState } from "react";
import { sentryApi } from "../../services/sentryApi";
const HAZARDS = ["landslide", "flood", "earthquake", "erosion", "cloudburst"];
const VULNERABLE_GROUPS = [
  ["elderly", "Elderly residents"],
  ["children", "Children"],
  ["peopleWithDisabilities", "People with disabilities"],
  ["pregnantPeople", "Pregnant people"],
  ["other", "Other vulnerable residents"],
];
function canCreateRecords() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
    return user?.role === "admin"
      || (user?.role === "authority" && user?.authorityStatus === "verified");
  } catch {
    return false;
  }
}
function numberField(value, label, { required = false, min = 0, max, step = "1" } = {}) {
  const number = Number(value);
  if (value === "" && !required) return undefined;
  if (!Number.isFinite(number) || (step === "1" && !Number.isInteger(number)) || number < min || (max !== undefined && number > max)) {
    throw new Error(`${label} must be ${min === 0 ? "a non-negative" : `at least ${min}`} ${step === "1" ? "whole number" : "number"}${max === undefined ? "" : ` no greater than ${max}`}.`);
  }
  return number;
}
function LocationFields({ values, onChange }) {
  return (
    <fieldset className="mb-3">
      <legend className="fs-6">Location coordinates</legend>
      <p className="form-text">Enter decimal-degree coordinates; longitude must be between -180 and 180, latitude between -90 and 90.</p>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor={`${values.prefix}-longitude`}>Longitude</label>
          <input id={`${values.prefix}-longitude`} className="form-control" type="number" step="any" min="-180" max="180" required value={values.longitude} onChange={(event) => onChange("longitude", event.target.value)} />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor={`${values.prefix}-latitude`}>Latitude</label>
          <input id={`${values.prefix}-latitude`} className="form-control" type="number" step="any" min="-90" max="90" required value={values.latitude} onChange={(event) => onChange("latitude", event.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}
function HabitationFields({ values, onChange }) {
  return (
    <>
      <div className="row g-3">
        <TextField id="habitation-name" label="Habitation name" value={values.name} onChange={(value) => onChange("name", value)} required maxLength={160} />
        <TextField id="habitation-district" label="District" value={values.district} onChange={(value) => onChange("district", value)} />
        <TextField id="habitation-state" label="State" value={values.state} onChange={(value) => onChange("state", value)} />
        <NumberInput id="habitation-population" label="Population" value={values.population} onChange={(value) => onChange("population", value)} required />
      </div>
      <LocationFields values={{ ...values, prefix: "habitation" }} onChange={onChange} />
      <fieldset className="mb-3">
        <legend className="fs-6">Vulnerable resident counts <span className="text-muted fw-normal">(optional)</span></legend>
        <div className="row g-3">
          {VULNERABLE_GROUPS.map(([key, label]) => (
            <NumberInput key={key} id={`habitation-${key}`} label={label} value={values[key]} onChange={(value) => onChange(key, value)} />
          ))}
        </div>
      </fieldset>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="habitation-exposure">Exposure classification</label>
          <select id="habitation-exposure" className="form-select" value={values.exposure} onChange={(event) => onChange("exposure", event.target.value)}>
            {["UNKNOWN", "LOW", "MODERATE", "HIGH", "CRITICAL"].map((exposure) => <option key={exposure} value={exposure}>{exposure}</option>)}
          </select>
        </div>
        <TextField id="habitation-access-road" label="Primary access road" value={values.primaryAccessRoad} onChange={(value) => onChange("primaryAccessRoad", value)} />
      </div>
    </>
  );
}
function RelocationSiteFields({ values, onChange }) {
  const setHazard = (hazard, checked) => {
    onChange("hazardExposure", checked
      ? [...values.hazardExposure, hazard]
      : values.hazardExposure.filter((value) => value !== hazard));
  };
  return (
    <>
      <div className="row g-3">
        <TextField id="site-name" label="Site name" value={values.name} onChange={(value) => onChange("name", value)} required maxLength={160} />
        <TextField id="site-district" label="District" value={values.district} onChange={(value) => onChange("district", value)} />
        <TextField id="site-state" label="State" value={values.state} onChange={(value) => onChange("state", value)} />
        <NumberInput id="site-total-capacity" label="Total capacity" value={values.totalCapacity} onChange={(value) => onChange("totalCapacity", value)} required />
        <NumberInput id="site-occupancy" label="Occupied capacity" value={values.occupancy} onChange={(value) => onChange("occupancy", value)} required />
        <NumberInput id="site-reserved-capacity" label="Reserved capacity" value={values.reservedCapacity} onChange={(value) => onChange("reservedCapacity", value)} required />
      </div>
      <LocationFields values={{ ...values, prefix: "site" }} onChange={onChange} />
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="site-road-access">Road access</label>
          <select id="site-road-access" className="form-select" value={values.roadAccess} onChange={(event) => onChange("roadAccess", event.target.value)}>
            {["UNKNOWN", "OPEN", "RESTRICTED", "BLOCKED"].map((access) => <option key={access} value={access}>{access}</option>)}
          </select>
        </div>
        <NumberInput id="site-suitability" label="Suitability score (0–100)" value={values.suitability} onChange={(value) => onChange("suitability", value)} max={100} step="any" />
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="site-status">Site status</label>
          <select id="site-status" className="form-select" value={values.status} onChange={(event) => onChange("status", event.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>
      <fieldset className="mb-3">
        <legend className="fs-6">Known hazard exposure</legend>
        <div className="d-flex flex-wrap gap-3">
          {HAZARDS.map((hazard) => (
            <div className="form-check" key={hazard}>
              <input className="form-check-input" id={`site-hazard-${hazard}`} type="checkbox" checked={values.hazardExposure.includes(hazard)} onChange={(event) => setHazard(hazard, event.target.checked)} />
              <label className="form-check-label text-capitalize" htmlFor={`site-hazard-${hazard}`}>{hazard}</label>
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="form-label" htmlFor="site-facilities">Facilities</label>
        <textarea id="site-facilities" className="form-control" rows="2" value={values.facilities} onChange={(event) => onChange("facilities", event.target.value)} aria-describedby="site-facilities-help" />
        <div id="site-facilities-help" className="form-text">Separate facility names with commas or new lines.</div>
      </div>
    </>
  );
}
function TextField({ id, label, value, onChange, required = false, maxLength }) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="form-control" type="text" value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} />
    </div>
  );
}
function NumberInput({ id, label, value, onChange, required = false, min = 0, max, step = "1" }) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="form-control" type="number" value={value} onChange={(event) => onChange(event.target.value)} required={required} min={min} max={max} step={step} />
    </div>
  );
}
const HABITATION_INITIAL = {
  name: "", district: "", state: "", longitude: "", latitude: "", population: "",
  elderly: "", children: "", peopleWithDisabilities: "", pregnantPeople: "", other: "",
  exposure: "UNKNOWN", primaryAccessRoad: "",
};
const SITE_INITIAL = {
  name: "", district: "", state: "", longitude: "", latitude: "", totalCapacity: "",
  occupancy: "", reservedCapacity: "", facilities: "", roadAccess: "UNKNOWN",
  hazardExposure: [], suitability: "", status: "ACTIVE",
};
function CreateRecordForm({ type, onCreated }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(type === "habitation" ? HABITATION_INITIAL : SITE_INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const permitted = canCreateRecords();
  if (!permitted) return null;
  const isHabitation = type === "habitation";
  const title = isHabitation ? "Add habitation" : "Register relocation site";
  const resetValues = isHabitation ? HABITATION_INITIAL : SITE_INITIAL;
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const longitude = numberField(values.longitude, "Longitude", { required: true, min: -180, max: 180, step: "any" });
      const latitude = numberField(values.latitude, "Latitude", { required: true, min: -90, max: 90, step: "any" });
      const location = { type: "Point", coordinates: [longitude, latitude] };
      let payload;
      if (isHabitation) {
        const population = numberField(values.population, "Population", { required: true });
        const vulnerableGroups = Object.fromEntries(VULNERABLE_GROUPS
          .map(([key, label]) => [key, numberField(values[key], label)])
          .filter(([, count]) => count !== undefined));
        if (Object.values(vulnerableGroups).reduce((sum, count) => sum + count, 0) > population) {
          throw new Error("Vulnerable resident counts cannot exceed the recorded population.");
        }
        payload = {
          name: values.name.trim(),
          district: values.district.trim(),
          state: values.state.trim(),
          location,
          population,
          ...(Object.keys(vulnerableGroups).length > 0 ? { vulnerableGroups } : {}),
          exposure: values.exposure,
          primaryAccessRoad: values.primaryAccessRoad.trim(),
        };
        await sentryApi.createHabitation(payload);
      } else {
        const totalCapacity = numberField(values.totalCapacity, "Total capacity", { required: true });
        const occupancy = numberField(values.occupancy, "Occupied capacity", { required: true });
        const reservedCapacity = numberField(values.reservedCapacity, "Reserved capacity", { required: true });
        if (occupancy + reservedCapacity > totalCapacity) {
          throw new Error("Occupied and reserved capacity cannot exceed total capacity.");
        }
        const suitability = numberField(values.suitability, "Suitability score", { max: 100, step: "any" });
        payload = {
          name: values.name.trim(),
          district: values.district.trim(),
          state: values.state.trim(),
          location,
          totalCapacity,
          occupancy,
          reservedCapacity,
          facilities: values.facilities.split(/[\n,]/).map((facility) => facility.trim()).filter(Boolean),
          roadAccess: values.roadAccess,
          hazardExposure: values.hazardExposure,
          ...(suitability === undefined ? {} : { suitability }),
          status: values.status,
        };
        await sentryApi.createRelocationSite(payload);
      }
      setValues(resetValues);
      setMessage(isHabitation ? "Habitation created successfully." : "Relocation site created successfully.");
      await onCreated();
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message || "Unable to save this record.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="sentry-panel mb-4" aria-labelledby={`${type}-create-heading`}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 id={`${type}-create-heading`} className="h5 mb-1">{title}</h2>
          <p className="small text-muted mb-0">Available to verified authorities and administrators.</p>
        </div>
        <button className="btn btn-primary" type="button" aria-expanded={open} aria-controls={`${type}-create-form`} onClick={() => { setOpen((previous) => !previous); setError(""); }}>
          {open ? "Close form" : title}
        </button>
      </div>
      {message ? <div className="alert alert-success mt-3 mb-0" role="status">{message}</div> : null}
      {open ? (
        <form id={`${type}-create-form`} className="mt-4" onSubmit={submit}>
          {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
          {isHabitation
            ? <HabitationFields values={values} onChange={update} />
            : <RelocationSiteFields values={values} onChange={update} />}
          <button className="btn btn-success mt-3" type="submit" disabled={saving}>
            {saving ? "Saving…" : isHabitation ? "Save habitation" : "Save relocation site"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
export default CreateRecordForm;
