const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Incident = require("../models/incident");
const Habitation = require("../models/habitation");
const riskAssessmentService = require("../services/risk_assessment_service");
const { createIncident, getIncidents, updateIncidentStatus } = require("../controllers/incident_controller");
test("incident habitation linkage is a root reference and coordinates are bounded", async () => {
    assert.ok(Incident.schema.path("linkedHabitation"));
    assert.equal(Incident.schema.path("location.linkedHabitation"), undefined);
    const invalidLocation = new Incident({
        type: "landslide",
        description: "Observed slope movement",
        location: { latitude: 91, longitude: 0 }
    });
    let validationError;
    try {
        await invalidLocation.validate();
    } catch (error) {
        validationError = error;
    }
    assert.ok(validationError.errors["location.latitude"]);
});
test("report retries with the same client ID return the existing report before re-uploading evidence", async () => {
    const originalFindOne = Incident.findOne;
    const incident = { _id: new mongoose.Types.ObjectId(), reportedBy: "user-1" };
    Incident.findOne = async (filter) => {
        assert.deepEqual(filter, { clientReportId: "stable-report-1" });
        return incident;
    };
    let statusCode;
    let body;
    const res = {
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; }
    };
    try {
        await createIncident({
            body: { clientReportId: "stable-report-1" },
            files: {},
            user: { userId: "user-1" }
        }, res);
        assert.equal(statusCode, 200);
        assert.equal(body.duplicate, true);
        assert.equal(body.data, incident);
    } finally {
        Incident.findOne = originalFindOne;
    }
});
test("incident list is reporter-scoped for citizens and includes active lifecycle states for authorities", async () => {
    const originalFind = Incident.find;
    let actualFilter;
    let result;
    Incident.find = (filter) => {
        actualFilter = filter;
        const query = {
            sort() { return this; },
            limit(count) {
                assert.equal(count, 1000);
                return this;
            },
            then(resolve) { resolve(result); }
        };
        return query;
    };
    const response = (req) => {
        let body;
        return {
            res: { status() { return this; }, json(value) { body = value; return this; } },
            body: () => body
        };
    };
    try {
        result = [{ _id: "incident-1", status: "verified" }];
        const citizen = response({ user: { role: "citizen", userId: "user-1" } });
        await getIncidents({ user: { role: "citizen", userId: "user-1" } }, citizen.res);
        assert.deepEqual(actualFilter, { reportedBy: "user-1" });
        assert.equal(citizen.body().data[0].status, "verified");
        const authority = response({ user: { role: "authority", userId: "authority-1" } });
        await getIncidents({ user: { role: "authority", userId: "authority-1" } }, authority.res);
        assert.deepEqual(actualFilter, { status: { $ne: "resolved" } });
    } finally {
        Incident.find = originalFind;
    }
});
test("verifying a high-severity incident recalculates its linked habitation and returns the outcome", async () => {
    const originals = {
        findByIdAndUpdate: Incident.findByIdAndUpdate,
        habitationFindById: Habitation.findById,
        assessHabitation: riskAssessmentService.assessHabitation
    };
    const incidentId = new mongoose.Types.ObjectId();
    const habitationId = new mongoose.Types.ObjectId();
    const habitation = { _id: habitationId };
    const updatedIncident = {
        _id: incidentId,
        status: "verified",
        severity: "critical",
        linkedHabitation: habitationId,
        location: { latitude: 27.3, longitude: 88.5 }
    };
    let assessed;
    Incident.findByIdAndUpdate = async (id, update, options) => {
        assert.equal(String(id), String(incidentId));
        assert.deepEqual(update, { status: "verified" });
        assert.equal(options.runValidators, true);
        return updatedIncident;
    };
    Habitation.findById = async (id) => {
        assert.equal(String(id), String(habitationId));
        return habitation;
    };
    riskAssessmentService.assessHabitation = async (record, assessedBy) => {
        assessed = { record, assessedBy };
    };
    let body;
    const res = { status() { return this; }, json(value) { body = value; return this; } };
    try {
        await updateIncidentStatus({
            params: { id: String(incidentId) },
            body: { status: "verified" },
            user: { userId: "authority-user" }
        }, res);
        assert.equal(assessed.record, habitation);
        assert.equal(assessed.assessedBy, "authority-user");
        assert.equal(body.riskRecalculation.status, "completed");
        assert.equal(body.riskRecalculation.habitationId, String(habitationId));
    } finally {
        Incident.findByIdAndUpdate = originals.findByIdAndUpdate;
        Habitation.findById = originals.habitationFindById;
        riskAssessmentService.assessHabitation = originals.assessHabitation;
    }
});
test("invalid incident statuses are rejected without writing", async () => {
    const originalFindByIdAndUpdate = Incident.findByIdAndUpdate;
    let wrote = false;
    Incident.findByIdAndUpdate = async () => {
        wrote = true;
    };
    let statusCode;
    let body;
    const res = {
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; }
    };
    try {
        await updateIncidentStatus({
            params: { id: new mongoose.Types.ObjectId().toString() },
            body: { status: "invented" },
            user: { userId: "authority-user" }
        }, res);
        assert.equal(statusCode, 400);
        assert.equal(body.success, false);
        assert.equal(wrote, false);
    } finally {
        Incident.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});
