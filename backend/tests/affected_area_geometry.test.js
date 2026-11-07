const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePolygon } = require("../services/affected_area_geometry");

const square = [[[77.2, 28.6], [77.3, 28.6], [77.3, 28.7], [77.2, 28.7]]];

test("an open ring is closed and kept counter-clockwise", () => {
    const ring = normalizePolygon(square)[0] === undefined ? null : normalizePolygon(square);
    assert.deepEqual(ring[0], ring.at(-1));
    assert.equal(ring.length, 5);
    const clockwise = [[[77.2, 28.6], [77.2, 28.7], [77.3, 28.7], [77.3, 28.6]]];
    const fixed = normalizePolygon(clockwise);
    let sum = 0;
    for (let i = 0; i < fixed.length - 1; i += 1) sum += fixed[i][0] * fixed[i + 1][1] - fixed[i + 1][0] * fixed[i][1];
    assert.ok(sum > 0, "counter-clockwise");
});

test("an already closed ring is accepted without a duplicate point", () => {
    const closed = [[...square[0], square[0][0]]];
    assert.equal(normalizePolygon(closed).length, 5);
});

test("bad shapes are rejected with a 400", () => {
    const bad = [
        undefined, "x", [], [[]], [[[77.2, 28.6], [77.3, 28.6]]],
        [[[77.2, 28.6], [77.3, "a"], [77.3, 28.7]]],
        [[[77.2, 28.6], [77.25, 28.65], [77.3, 28.7]]],
        [[[77.2, 28.6], [77.3, 28.7], [77.3, 28.6], [77.2, 28.7]]],
        [[[10, 28.6], [10.1, 28.6], [10.1, 28.7]]],
        [[[70, 20], [75, 20], [75, 25], [70, 25]]],
    ];
    for (const coordinates of bad) {
        assert.throws(() => normalizePolygon(coordinates), (error) => error.statusCode === 400, JSON.stringify(coordinates));
    }
});

test("too many points are rejected", () => {
    const ring = [];
    for (let i = 0; i < 300; i += 1) {
        const angle = (i / 300) * Math.PI * 2;
        ring.push([77.2 + 0.1 * Math.cos(angle), 28.6 + 0.1 * Math.sin(angle)]);
    }
    assert.throws(() => normalizePolygon([ring]), (error) => error.statusCode === 400);
});
