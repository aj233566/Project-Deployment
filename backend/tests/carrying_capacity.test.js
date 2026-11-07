const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCarryingCapacity } = require("../risk-intelligence/services/carrying_capacity_engine");
test("site capacity does not report a zero-demand gap when no population request is known", () => {
    const result = calculateCarryingCapacity({
        totalCapacity: 100,
        occupancy: 40,
        reservedCapacity: 10
    });
    assert.equal(result.available, 50);
    assert.equal(result.required, null);
    assert.equal(result.capacityGap, null);
    assert.equal(result.canAccommodate, null);
});
test("site capacity computes gap and accommodation only for supplied demand", () => {
    const result = calculateCarryingCapacity({
        totalCapacity: 100,
        occupancy: 40,
        reservedCapacity: 10
    }, 60);
    assert.equal(result.available, 50);
    assert.equal(result.required, 60);
    assert.equal(result.capacityGap, 10);
    assert.equal(result.canAccommodate, false);
});
test("site capacity remains unavailable when occupancy or reserve values are missing", () => {
    const result = calculateCarryingCapacity({
        totalCapacity: 100,
        occupancy: null,
        reservedCapacity: 0
    }, 60);
    assert.equal(result.available, null);
    assert.equal(result.capacityGap, null);
    assert.equal(result.canAccommodate, null);
});
