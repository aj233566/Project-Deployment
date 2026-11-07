const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Incident = require("../models/incident");
const EmergencyDispatch = require("../models/emergency_dispatch");
const { dispatchTeam } = require("../controllers/emergency_priority_controller");
test("emergency dispatches enforce one active assignment per incident", () => {
    const activeIndex = EmergencyDispatch.schema.indexes().find(([, options]) =>
        options.name === "one_active_dispatch_per_incident"
    );
    assert.ok(activeIndex);
    assert.deepEqual(activeIndex[0], { incidentId: 1 });
    assert.equal(activeIndex[1].unique, true);
    assert.deepEqual(activeIndex[1].partialFilterExpression, {
        status: { $in: ["dispatched", "en_route", "arrived"] }
    });
});
test("dispatch endpoint returns the existing active assignment without creating a duplicate", async () => {
    const originalFindById = Incident.findById;
    const originalFindOne = EmergencyDispatch.findOne;
    const incident = {
        _id: new mongoose.Types.ObjectId(),
        status: "in_progress"
    };
    const activeDispatch = {
        _id: new mongoose.Types.ObjectId(),
        incidentId: incident._id,
        status: "dispatched"
    };
    let created = false;
    const originalCreate = EmergencyDispatch.create;
    Incident.findById = async () => incident;
    EmergencyDispatch.findOne = () => ({
        sort() { return this; },
        lean: async () => activeDispatch
    });
    EmergencyDispatch.create = async () => {
        created = true;
        throw new Error("Should not create when an active dispatch exists");
    };
    let statusCode;
    let body;
    const res = {
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; }
    };
    try {
        await dispatchTeam({
            params: { id: String(incident._id) },
            body: { unitName: "Rescue Unit 1" }
        }, res);
        assert.equal(statusCode, 409);
        assert.equal(body.data, activeDispatch);
        assert.equal(created, false);
    } finally {
        Incident.findById = originalFindById;
        EmergencyDispatch.findOne = originalFindOne;
        EmergencyDispatch.create = originalCreate;
    }
});
test("dispatch endpoint converts a concurrent unique-index collision into a conflict response", async () => {
    const originalFindById = Incident.findById;
    const originalFindOne = EmergencyDispatch.findOne;
    const originalCreate = EmergencyDispatch.create;
    const incident = {
        _id: new mongoose.Types.ObjectId(),
        status: "submitted"
    };
    const activeDispatch = {
        _id: new mongoose.Types.ObjectId(),
        incidentId: incident._id,
        status: "dispatched"
    };
    let lookupCount = 0;
    Incident.findById = async () => incident;
    EmergencyDispatch.findOne = () => ({
        sort() { return this; },
        lean: async () => {
            lookupCount += 1;
            return lookupCount === 1 ? null : activeDispatch;
        }
    });
    EmergencyDispatch.create = async () => {
        throw Object.assign(new Error("Duplicate active dispatch"), { code: 11000 });
    };
    let statusCode;
    let body;
    const res = {
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; }
    };
    try {
        await dispatchTeam({
            params: { id: String(incident._id) },
            body: { unitName: "Rescue Unit 2" }
        }, res);
        assert.equal(statusCode, 409);
        assert.equal(body.data, activeDispatch);
        assert.equal(lookupCount, 2);
    } finally {
        Incident.findById = originalFindById;
        EmergencyDispatch.findOne = originalFindOne;
        EmergencyDispatch.create = originalCreate;
    }
});
