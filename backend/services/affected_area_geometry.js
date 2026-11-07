"use strict";

// Validation for affected-area and safe-zone outlines drawn on the map.
// Input is a GeoJSON Polygon ring list: [[[lng, lat], ...]]. Only the outer ring is kept.

const MAX_VERTICES = 200;
const MIN_VERTICES = 3;
// India and its surroundings; keeps obviously wrong coordinates out of the database.
const BOUNDS = { south: 5, north: 38, west: 66, east: 100 };
// A single drawn area larger than this is almost certainly a mistake (about the size of a large district).
const MAX_SPAN_DEG = 3;

function fail(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function isPoint(point) {
    return Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === "number" && Number.isFinite(value));
}

// Signed area by the shoelace formula; zero means the points are in a line.
function ringArea(ring) {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
        sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return sum / 2;
}

function segmentsCross(a, b, c, d) {
    const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

function selfIntersects(ring) {
    const n = ring.length - 1;
    for (let i = 0; i < n; i += 1) {
        for (let j = i + 2; j < n; j += 1) {
            if (i === 0 && j === n - 1) continue;
            if (segmentsCross(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
        }
    }
    return false;
}

// Returns a closed outer ring of [lng, lat] points, or throws an error with statusCode 400.
function normalizePolygon(coordinates) {
    if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) throw fail("Outline must be a polygon: [[[lng, lat], ...]].");
    const ring = coordinates[0].map((point) => {
        if (!isPoint(point)) throw fail("Every outline point must be [longitude, latitude].");
        return [Number(point[0].toFixed(6)), Number(point[1].toFixed(6))];
    });
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (ring.length > 1 && first[0] === last[0] && first[1] === last[1]) ring.pop();
    if (ring.length < MIN_VERTICES) throw fail(`An outline needs at least ${MIN_VERTICES} different points.`);
    if (ring.length > MAX_VERTICES) throw fail(`An outline can have at most ${MAX_VERTICES} points.`);
    for (const [lng, lat] of ring) {
        if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) {
            throw fail("Outline points must be inside India and its surroundings.");
        }
    }
    const closed = [...ring, ring[0]];
    const lngs = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    if (Math.max(...lngs) - Math.min(...lngs) > MAX_SPAN_DEG || Math.max(...lats) - Math.min(...lats) > MAX_SPAN_DEG) {
        throw fail(`An outline cannot be wider than ${MAX_SPAN_DEG} degrees.`);
    }
    if (Math.abs(ringArea(closed)) < 1e-10) throw fail("The outline points are in a line; they must enclose an area.");
    if (selfIntersects(closed)) throw fail("The outline crosses itself.");
    // GeoJSON wants the outer ring counter-clockwise.
    return ringArea(closed) < 0 ? closed.reverse() : closed;
}

module.exports = { normalizePolygon, MAX_VERTICES, MAX_SPAN_DEG };
