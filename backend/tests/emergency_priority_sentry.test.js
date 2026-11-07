const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Incident = require("../models/incident");
const Habitation = require("../models/habitation");
const RelocationSite = require("../models/relocation_site");
const EmergencyDispatch = require("../models/emergency_dispatch");
const { getPrioritisedAreas } = require("../controllers/emergency_priority_controller");
function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.body = value;
            return this;
        }
    };
}
test("verified authority priority includes linked SENTRY risk, vulnerability, and safe-site capacity", async () => {
    const originals = {
        incidentFind: Incident.find,
        habitationFind: Habitation.find,
        siteFind: RelocationSite.find,
        dispatchFind: EmergencyDispatch.find
    };
    const incidentId = new mongoose.Types.ObjectId();
    const habitationId = new mongoose.Types.ObjectId();
    const incident = {
        _id: incidentId,
        linkedHabitation: habitationId,
        status: "verified",
        severity: "critical",
        type: "landslide",
        location: { latitude: 27.2, longitude: 88.5, address: "Recorded location" },
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z")
    };
    try {
        Incident.find = () => ({
            sort() { return this; },
            lean: async () => [incident]
        });
        Habitation.find = () => ({
            lean: async () => [{
                _id: habitationId,
                name: "Registered habitation",
                population: 40,
                vulnerableGroups: {
                    elderly: 4,
                    children: 3,
                    peopleWithDisabilities: 1,
                    pregnantPeople: 0,
                    other: 0
                },
                risk: { score: 82, level: "RED" },
                primaryHazard: "landslide",
                relocationStatus: "PLANNED",
                location: { coordinates: [88.5, 27.2] }
            }]
        });
        RelocationSite.find = () => ({
            lean: async () => [{
                _id: new mongoose.Types.ObjectId(),
                name: "Safe candidate",
                status: "ACTIVE",
                totalCapacity: 60,
                occupancy: 10,
                reservedCapacity: 5,
                roadAccess: "OPEN",
                suitability: 85,
                hazardExposure: ["flood"],
                location: { coordinates: [88.6, 27.3] }
            }]
        });
        EmergencyDispatch.find = () => ({
            sort() { return this; },
            lean: async () => []
        });
        const res = createResponse();
        await getPrioritisedAreas({
            user: { role: "authority", authorityStatus: "verified" }
        }, res);
        assert.equal(res.statusCode, 200);
        const [area] = res.body.data;
        assert.equal(area.linkedHabitation.name, "Registered habitation");
        assert.equal(area.linkedHabitation.riskLevel, "RED");
        assert.equal(area.affectedPopulation, 40);
        assert.equal(area.vulnerablePopulation, 8);
        assert.equal(area.relocationDecision.priority, "IMMEDIATE");
        assert.equal(area.relocationDecision.candidates[0].name, "Safe candidate");
        assert.equal(area.relocationDecision.candidates[0].usable, true);
        assert.equal(area.relocationDecision.capacityGap, 0);
    } finally {
        Incident.find = originals.incidentFind;
        Habitation.find = originals.habitationFind;
        RelocationSite.find = originals.siteFind;
        EmergencyDispatch.find = originals.dispatchFind;
    }
});
test("citizen priority reads preserve incident queues without exposing habitation assessments", async () => {
    const originals = {
        incidentFind: Incident.find,
        habitationFind: Habitation.find,
        siteFind: RelocationSite.find,
        dispatchFind: EmergencyDispatch.find
    };
    const incident = {
        _id: new mongoose.Types.ObjectId(),
        linkedHabitation: new mongoose.Types.ObjectId(),
        status: "verified",
        severity: "high",
        type: "landslide",
        location: { latitude: 27.2, longitude: 88.5 },
        createdAt: new Date(),
        updatedAt: new Date()
    };
    try {
        Incident.find = () => ({
            sort() { return this; },
            lean: async () => [incident]
        });
        Habitation.find = () => {
            throw new Error("Citizen reads must not query protected SENTRY relocation data");
        };
        RelocationSite.find = () => {
            throw new Error("Citizen reads must not query protected SENTRY relocation data");
        };
        EmergencyDispatch.find = () => ({
            sort() { return this; },
            lean: async () => []
        });
        const res = createResponse();
        await getPrioritisedAreas({ user: { role: "citizen", userId: "citizen-1" } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.count, 1);
        assert.equal(res.body.data[0].incidentStatus, "verified");
        assert.equal(res.body.data[0].linkedHabitation, null);
        assert.equal(res.body.data[0].relocationDecision, null);
    } finally {
        Incident.find = originals.incidentFind;
        Habitation.find = originals.habitationFind;
        RelocationSite.find = originals.siteFind;
        EmergencyDispatch.find = originals.dispatchFind;
    }
});
