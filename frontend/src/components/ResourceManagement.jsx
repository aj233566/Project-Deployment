import { useEffect, useMemo, useState } from "react";
import { Truck, Search } from "lucide-react";
import { resourcesApi } from "../services/api";
import { getStoredUser } from "../context/session";
import "../css/resources.css";
function canCreateResources() {
  const user = getStoredUser();
  return user?.role === "authority" && user?.authorityStatus === "verified";
}
const EMPTY_RESOURCE_FORM = {
  resourceId: "",
  name: "",
  category: "",
  description: "",
  total: "",
  deployed: "0",
  reserved: "0",
  location: "",
};
const matchesCategory = (rawCategory, filter) => {
  const category = String(rawCategory || "").trim().toUpperCase();
  if (filter === "ALL") return true;
  if (filter === "NDRF") return category.includes("NDRF");
  if (filter === "SDRF") return category.includes("SDRF");
  if (filter === "MEDICAL TRANSPORT") return /AMBULANCE|MEDICAL|TRANSPORT/.test(category);
  if (filter === "ROAD CLEARING") return /ROAD|CLEAR|EARTH|BRO/.test(category);
  return category === filter;
};
function ResourceCreateForm({ onCreated }) {
  const [values, setValues] = useState(EMPTY_RESOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const calculatedAvailable = Number(values.total || 0) - Number(values.deployed || 0) - Number(values.reserved || 0);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const quantity = (key, label, required = false) => {
        const raw = values[key].trim();
        if (!raw && !required) return undefined;
        const number = Number(raw);
        if (!Number.isSafeInteger(number) || number < 0) {
          throw new Error(`${label} must be a non-negative whole number.`);
        }
        return number;
      };
      const total = quantity("total", "Total units", true);
      const deployed = quantity("deployed", "Deployed units");
      const reserved = quantity("reserved", "Reserved units");
      const assigned = deployed ?? 0;
      const held = reserved ?? 0;
      const available = total - assigned - held;
      if (!values.name.trim()) throw new Error("Resource name is required.");
      if (!values.category.trim()) throw new Error("Category is required.");
      if (available < 0) throw new Error("Total units must cover deployed and reserved units.");
      const payload = {
        ...(values.resourceId.trim() ? { resourceId: values.resourceId.trim() } : {}),
        name: values.name.trim(),
        category: values.category.trim(),
        description: values.description.trim(),
        total,
        available,
        deployed: assigned,
        reserved: held,
        location: values.location.trim(),
      };
      await resourcesApi.createResource(payload);
      setValues(EMPTY_RESOURCE_FORM);
      setMessage("Resource saved to the registered inventory.");
      await onCreated();
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message || "Unable to save this resource.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="resource-create-form" onSubmit={submit}>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}
      <div className="row g-3">
        <ResourceTextField id="resource-id" label="Resource ID (optional)" value={values.resourceId} onChange={(value) => update("resourceId", value)} />
        <ResourceTextField id="resource-name" label="Resource name" value={values.name} onChange={(value) => update("name", value)} required />
        <ResourceTextField id="resource-category" label="Category" value={values.category} onChange={(value) => update("category", value)} required />
        <ResourceTextField id="resource-location" label="Location / station" value={values.location} onChange={(value) => update("location", value)} />
        <ResourceNumberField id="resource-total" label="Total units" value={values.total} onChange={(value) => update("total", value)} required />
        <ResourceNumberField id="resource-deployed" label="Already assigned / deployed units" value={values.deployed} onChange={(value) => update("deployed", value)} />
        <ResourceNumberField id="resource-reserved" label="Reserved units" value={values.reserved} onChange={(value) => update("reserved", value)} />
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="resource-available">Available units (calculated)</label>
          <input id="resource-available" className="form-control" type="number" value={values.total.trim() && Number.isSafeInteger(calculatedAvailable) && calculatedAvailable >= 0 ? calculatedAvailable : ""} readOnly disabled />
          <div className="form-text">Available = total − deployed − reserved.</div>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="resource-description">Description (optional)</label>
          <textarea id="resource-description" className="form-control" rows="2" value={values.description} onChange={(event) => update("description", event.target.value)} />
        </div>
      </div>
      <button className="btn btn-success mt-3" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save resource"}
      </button>
    </form>
  );
}
function ResourceTextField({ id, label, value, onChange, required = false }) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="form-control" type="text" value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={160} />
    </div>
  );
}
function ResourceNumberField({ id, label, value, onChange, required = false }) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="form-control" type="number" min="0" step="1" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}
function ResourceEditForm({ resource, onCancel, onSaved }) {
  const [values, setValues] = useState({
    name: resource.name || "",
    category: resource.category || "",
    description: resource.description || "",
    total: String(resource.total ?? resource.totalUnits ?? ""),
    deployed: String(resource.deployed ?? resource.deployedUnits ?? 0),
    reserved: String(resource.reserved ?? 0),
    location: resource.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const total = Number(values.total);
  const deployed = Number(values.deployed);
  const reserved = Number(values.reserved);
  const available = total - deployed - reserved;
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!values.name.trim() || !values.category.trim()) throw new Error("Resource name and category are required.");
      if (![total, deployed, reserved].every((value) => Number.isSafeInteger(value) && value >= 0)) {
        throw new Error("Unit counts must be non-negative whole numbers.");
      }
      if (available < 0) throw new Error("Total units must cover deployed and reserved units.");
      await resourcesApi.updateResource(resource._id || resource.id, {
        name: values.name.trim(),
        category: values.category.trim(),
        description: values.description.trim(),
        total,
        reserved,
        location: values.location.trim(),
      });
      await onSaved();
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || "Unable to update this resource.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="resource-create-form" onSubmit={submit}>
      <h3 className="h5 mb-3">Edit {resource.name || "resource"}</h3>
      <p className="small text-muted">Dispatching a unit increases deployed and reduces available. Marking its task done returns it to available units.</p>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      <div className="row g-3">
        <ResourceTextField id="edit-resource-name" label="Resource name" value={values.name} onChange={(value) => update("name", value)} required />
        <ResourceTextField id="edit-resource-category" label="Category" value={values.category} onChange={(value) => update("category", value)} required />
        <ResourceTextField id="edit-resource-location" label="Location / station" value={values.location} onChange={(value) => update("location", value)} />
        <ResourceNumberField id="edit-resource-total" label="Total units" value={values.total} onChange={(value) => update("total", value)} required />
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="edit-resource-deployed">Assigned / deployed units</label>
          <input id="edit-resource-deployed" className="form-control" type="number" value={values.deployed} readOnly disabled />
        </div>
        <ResourceNumberField id="edit-resource-reserved" label="Reserved units" value={values.reserved} onChange={(value) => update("reserved", value)} />
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="edit-resource-available">Available units (calculated)</label>
          <input id="edit-resource-available" className="form-control" type="number" value={Number.isSafeInteger(available) && available >= 0 ? available : ""} readOnly disabled />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="edit-resource-description">Description</label>
          <textarea id="edit-resource-description" className="form-control" rows="2" value={values.description} onChange={(event) => update("description", event.target.value)} />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-success" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
const ResourceManagement = () => {
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deletingResourceId, setDeletingResourceId] = useState(null);
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const canCreate = canCreateResources();
  useEffect(() => {
    let mounted = true;
    resourcesApi.getResources()
      .then((response) => {
        if (!mounted) return;
        const resourceList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response) ? response : null;
        if (!resourceList) throw new Error("The resource service returned an invalid response.");
        setResources(resourceList);
        setError("");
      })
      .catch((loadError) => {
        console.error("Failed to load resources:", loadError);
        if (mounted) {
          setResources([]);
          setError(loadError.message || "Unable to load resource inventory.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadToken]);
  const filteredResources = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return resources.filter((res) => {
      const name = String(res?.name || "").toLowerCase();
      const location = String(res?.location || "").toLowerCase();
      const type = String(res?.type || "").toLowerCase();
      const category = String(res?.category || "").toUpperCase();
      const matchSearch =
        !search ||
        name.includes(search) ||
        location.includes(search) ||
        type.includes(search) ||
        category.toLowerCase().includes(search);
      if (!matchSearch) return false;
      return matchesCategory(category, categoryFilter);
    });
  }, [resources, searchTerm, categoryFilter]);
  const categoryCount = (filter) => resources.filter((resource) => matchesCategory(resource.category, filter)).length;
  const reloadResources = () => {
    setLoading(true);
    setReloadToken((value) => value + 1);
  };
  const deleteResource = async (resource) => {
    const name = resource?.name || "this resource";
    if (!window.confirm(`Delete ${name} from the resource inventory?`)) return;
    setDeletingResourceId(resource._id || resource.id);
    setActionError("");
    setActionNotice("");
    try {
      await resourcesApi.deleteResource(resource._id || resource.id);
      setActionNotice(`${name} was deleted.`);
      reloadResources();
    } catch (deleteError) {
      setActionError(deleteError.response?.data?.message || deleteError.message || "Unable to delete this resource.");
    } finally {
      setDeletingResourceId(null);
    }
  };
  return (
    <div className="container-fluid p-0 resources-management-container">

      <div className="ops-panel">
        <div className="ops-panel-header">
          <h2 className="ops-panel-title">
            <Truck size={18} className="panel-icon-info" />

            <span>Resources &amp; Facilities</span>
          </h2>

          <span className="badge-ops info">
            {loading || error ? "Inventory unavailable" : `${resources.length} Resource Records`}
          </span>
          {canCreate ? (
            <button className="btn btn-success btn-sm ms-auto" type="button" aria-expanded={createOpen} aria-controls="resource-create-form-panel" onClick={() => setCreateOpen((open) => !open)}>
              {createOpen ? "Close form" : "Add resource"}
            </button>
          ) : null}
        </div>

        {canCreate && createOpen ? (
          <section id="resource-create-form-panel" className="p-3 border-bottom" aria-label="Add resource to inventory">
            <ResourceCreateForm onCreated={async () => {
              setCreateOpen(false);
              setActionNotice("Resource saved to the registered inventory.");
              setLoading(true);
              setReloadToken((value) => value + 1);
            }} />
          </section>
        ) : null}

        {error ? (
          <div className="alert alert-danger m-3" role="alert">
            {error}
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setLoading(true);
                setError("");
                setReloadToken((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {actionError ? <div className="alert alert-danger m-3" role="alert">{actionError}</div> : null}
        {actionNotice ? <div className="alert alert-success m-3" role="status">{actionNotice}</div> : null}
        {canCreate && editingResource ? (
          <section className="p-3 border-bottom" aria-label="Edit resource">
            <ResourceEditForm
              resource={editingResource}
              onCancel={() => setEditingResource(null)}
              onSaved={async () => {
                setEditingResource(null);
                setActionNotice("Resource changes saved. Available units were recalculated.");
                reloadResources();
              }}
            />
          </section>
        ) : null}


        <div className="alert-filter-bar">
          <div className="filter-left-group">
            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "ALL" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("ALL")}
            >
              All Assets ({categoryCount("ALL")})
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "NDRF" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("NDRF")}
            >
              NDRF Units ({categoryCount("NDRF")})
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "SDRF" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("SDRF")}
            >
              SDRF Units ({categoryCount("SDRF")})
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "MEDICAL TRANSPORT" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("MEDICAL TRANSPORT")}
            >
              Ambulances ({categoryCount("MEDICAL TRANSPORT")})
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "ROAD CLEARING" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("ROAD CLEARING")}
            >
              Earthmovers &amp; BRO ({categoryCount("ROAD CLEARING")})
            </button>
          </div>


          <div className="resource-search-wrapper">
            <Search size={14} className="resource-search-icon" />

            <input
              type="text"
              className="ops-input"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        <div className="table-responsive resource-table-wrapper">
          {loading && (
            <div className="resource-loading">
              Loading resource inventory...
            </div>
          )}

          {!loading && !error && (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Category</th>
                  <th>Total Units</th>
                  <th>Available</th>
                  <th>Deployed</th>
                  <th>Location / Station</th>
                  <th>Contact Point</th>
                  <th>Status</th>
                  {canCreate ? <th>Actions</th> : null}
                </tr>
              </thead>

              <tbody>
                {filteredResources.map((res, index) => {
                  const resourceId = res?.id || res?._id || `RES-${index + 1}`;
                  const status = String(res?.status || "Available");
                  const isActive = status.toLowerCase().includes("active");
                  return (
                    <tr key={resourceId}>

                      <td>
                        <strong className="resource-name">
                          {res?.name || "Unnamed Resource"}
                        </strong>

                        <div className="resource-id">{resourceId}</div>
                      </td>
                      <td>
                        <span className="badge-ops neutral">
                          {res?.category || "General"}
                        </span>
                      </td>


                      <td className="resource-number">
                        {Number.isFinite(res?.totalUnits ?? res?.total)
                          ? (res.totalUnits ?? res.total).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-number available">
                        {Number.isFinite(res?.availableUnits ?? res?.available)
                          ? (res.availableUnits ?? res.available).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-number deployed">
                        {Number.isFinite(res?.deployedUnits ?? res?.deployed)
                          ? (res.deployedUnits ?? res.deployed).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-location">
                        {res?.location || "—"}
                      </td>


                      <td className="resource-contact">
                        <div>{res?.contactPerson || "—"}</div>

                        {res?.phone && <small>{res.phone}</small>}
                      </td>


                      <td>
                        <span
                          className={`badge-ops ${
                            isActive ? "warning" : "safe"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      {canCreate ? (
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => { setEditingResource(res); setActionError(""); setActionNotice(""); }}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => deleteResource(res)} disabled={deletingResourceId === resourceId}>
                              {deletingResourceId === resourceId ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}


                {filteredResources.length === 0 && (
                  <tr>
                    <td colSpan={canCreate ? 9 : 8} className="resource-empty">
                      No resources match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default ResourceManagement;
