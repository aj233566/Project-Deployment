const test = require("node:test");
const assert = require("node:assert/strict");
const { assessRelocationPriority } = require("../risk-intelligence/services/relocationPriorityEngine");
test("relocation priority ranks an eligible site and calculates known capacity gap", () => {
    const result = assessRelocationPriority({
        _id: "hab-1",
        location: { coordinates: [88.5, 27.2] },
        primaryHazard: "landslide",
        population: 80,
        risk: { score: 82, level: "RED" }
    }, [
        {
            _id: "site-exposed",
            name: "Exposed site",
            status: "ACTIVE",
            location: { coordinates: [88.6, 27.3] },
            totalCapacity: 100,
            occupancy: 0,
            reservedCapacity: 0,
            roadAccess: "OPEN",
            hazardExposure: ["landslide"],
            suitability: 90
        },
        {
            _id: "site-candidate",
            name: "Candidate site",
            status: "ACTIVE",
            location: { coordinates: [88.7, 27.3] },
            totalCapacity: 60,
            occupancy: 10,
            reservedCapacity: 5,
            roadAccess: "OPEN",
            hazardExposure: ["flood"],
            suitability: 80
        }
    ]);
    assert.equal(result.priority, "IMMEDIATE");
    assert.equal(result.candidates[0].siteId, "site-candidate");
    assert.equal(result.candidates[0].usable, true);
    assert.equal(result.candidates[0].available, 45);
    assert.equal(result.candidates[1].usable, false);
    assert.equal(result.capacityGap, 35);
});
test("unassessed habitation reports unavailable priority and capacity gap", () => {
    const result = assessRelocationPriority({
        _id: "hab-unknown",
        risk: { score: null, level: "UNKNOWN" },
        population: null
    });
    assert.equal(result.priority, "UNASSESSED");
    assert.equal(result.capacityGap, null);
    assert.equal(result.population, null);
});
