const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Habitation = require("../models/habitation");
const { updateHabitation } = require("../controllers/habitation_controller");
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
test("habitation relocation decisions reject unsupported values before writing", async () => {
    const originalFindByIdAndUpdate = Habitation.findByIdAndUpdate;
    let wrote = false;
    Habitation.findByIdAndUpdate = async () => {
        wrote = true;
        throw new Error("Invalid decision must not reach persistence");
    };
    const res = responseRecorder();
    try {
        await updateHabitation({
            params: { id: String(new mongoose.Types.ObjectId()) },
            body: { relocationStatus: "EVACUATE_NOW" },
            user: { userId: String(new mongoose.Types.ObjectId()) }
        }, res, (error) => { throw error; });
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /valid relocationStatus/);
        assert.equal(wrote, false);
    } finally {
        Habitation.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});
test("habitation relocation decisions persist only the recorded status and actor", async () => {
    const originalFindByIdAndUpdate = Habitation.findByIdAndUpdate;
    const id = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    let capturedUpdates;
    let capturedOptions;
    const updated = { _id: id, relocationStatus: "PLANNED" };
    Habitation.findByIdAndUpdate = async (queryId, updates, options) => {
        assert.equal(String(queryId), String(id));
        capturedUpdates = updates;
        capturedOptions = options;
        return updated;
    };
    const res = responseRecorder();
    try {
        await updateHabitation({
            params: { id: String(id) },
            body: { relocationStatus: "PLANNED", risk: { level: "RED" } },
            user: { userId: String(actor) }
        }, res, (error) => { throw error; });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data, updated);
        assert.deepEqual(capturedUpdates, { relocationStatus: "PLANNED", updatedBy: String(actor) });
        assert.equal(capturedOptions.runValidators, true);
    } finally {
        Habitation.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});
