const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Alert = require("../models/alert");
const Habitation = require("../models/habitation");
const { createTargetedAlert } = require("../controllers/targeted_alert_controller");
function responseRecorder() {
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
test("targeted alerts validate, resolve habitat targets, and disclose delivery limits", async () => {
    const originalFind = Habitation.find;
    const originalCreate = Alert.create;
    try {
        let databaseTouched = false;
        Habitation.find = () => {
            databaseTouched = true;
            throw new Error("Invalid request must be rejected before a query");
        };
        Alert.create = async () => {
            databaseTouched = true;
            throw new Error("Invalid request must be rejected before a write");
        };
        const invalidResponse = responseRecorder();
        await createTargetedAlert({
            body: {
                hazardType: "flood",
                zoneType: "RED",
                targetType: "radius",
                location: { latitude: 27.2, longitude: 88.5 },
                radiusKm: 0,
                action: "Follow authority instructions.",
                expiresAt: new Date(Date.now() + 60_000),
                riskScore: 82,
                riskLevel: "CRITICAL"
            }
        }, invalidResponse, (error) => { throw error; });
        assert.equal(invalidResponse.statusCode, 400);
        assert.match(invalidResponse.body.message, /Radius must be greater than 0/);
        assert.equal(databaseTouched, false);
        const habitationId = new mongoose.Types.ObjectId();
        const created = [];
        Habitation.find = () => ({
            select() { return this; },
            lean: async () => [{ _id: habitationId }]
        });
        Alert.create = async (payload) => {
            created.push(payload);
            return payload;
        };
        const habitationResponse = responseRecorder();
        await createTargetedAlert({
            body: {
                hazardType: "flood",
                zoneType: "RED",
                targetType: "habitations",
                location: { latitude: 27.2, longitude: 88.5 },
                affectedHabitations: [String(habitationId)],
                action: "Follow authority instructions.",
                expiresAt: new Date(Date.now() + 60_000),
                riskScore: 82,
                riskLevel: "CRITICAL",
                recommendations: ["Follow official instructions."]
            }
        }, habitationResponse, (error) => { throw error; });
        assert.equal(habitationResponse.statusCode, 201);
        assert.deepEqual(created[0].affectedHabitations, [habitationId]);
        assert.match(habitationResponse.body.data.residentDelivery, /Not configured/);
        let zoneQuery;
        const zoneHabitations = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        Habitation.find = (query) => {
            zoneQuery = query;
            return {
                select() { return this; },
                lean: async () => zoneHabitations.map((_id) => ({ _id }))
            };
        };
        const zoneResponse = responseRecorder();
        await createTargetedAlert({
            body: {
                hazardType: "flood",
                zoneType: "ORANGE",
                targetType: "zone",
                location: { latitude: 27.2, longitude: 88.5 },
                action: "Follow authority instructions.",
                expiresAt: new Date(Date.now() + 60_000),
                riskScore: 67,
                riskLevel: "HIGH"
            }
        }, zoneResponse, (error) => { throw error; });
        assert.equal(zoneResponse.statusCode, 201);
        assert.deepEqual(zoneQuery, { active: true, "risk.level": "ORANGE" });
        assert.deepEqual(created[1].affectedHabitations, zoneHabitations);
        assert.equal(zoneResponse.body.data.affectedHabitationCount, 2);
    } finally {
        Habitation.find = originalFind;
        Alert.create = originalCreate;
    }
});
