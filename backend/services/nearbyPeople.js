// "People nearby": a person who switches sharing on appears to other people who are sharing too (and to authority and admin accounts).
// Nothing is shared unless the person turns it on; turning it off, logging out or closing the page removes them. A person's entry is also
// dropped by itself when it has not been refreshed for a few minutes. Only the first name, a rough kind of status and the place are
// shared. The place is rounded to about 100 m. There is no chat and no phone number or address.

const STATUSES = ["need-help", "can-help", "safe", "sharing"];
const STATUS_TTL_SECONDS = 300;
const RESPONSES = ["on-the-way", "noted"];
// An entry older than this is treated as gone even before the database removes it.
const FRESH_MS = 150 * 1000;
const LOCATION_STEP = 0.001;
const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;
const MAX_RESULTS = 300;

const round = (value) => Number((Math.round(value / LOCATION_STEP) * LOCATION_STEP).toFixed(3));

// Returns { lat, lng } rounded, or null when it is not a real place.
function approximateLocation(lat, lng) {
    if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") return null;
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
    return { lat: round(la), lng: round(ln) };
}

function distanceKm(aLat, aLng, bLat, bLng) {
    const rad = (degrees) => (degrees * Math.PI) / 180;
    const dLat = rad(bLat - aLat);
    const dLng = rad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function firstName(name) {
    const word = String(name || "").replace(/[^\p{L}\p{N}' -]/gu, " ").trim().split(/\s+/)[0];
    return (word || "Neighbour").slice(0, 30);
}

function clampRadius(value) {
    const radius = Number(value);
    if (!Number.isFinite(radius) || radius <= 0) return DEFAULT_RADIUS_KM;
    return Math.min(radius, MAX_RADIUS_KM);
}

// Checks what a browser sends. Returns { ok: true, value: { status, location } } or { ok: false, message }.
function validateShare(body) {
    const status = STATUSES.includes(body?.status) ? body.status : "sharing";
    const location = approximateLocation(body?.lat, body?.lng);
    if (!location) return { ok: false, message: "A valid location is needed." };
    return { ok: true, value: { status, location } };
}

const isFresh = (entry, now = Date.now()) => now - new Date(entry.updatedAt).getTime() <= FRESH_MS;

// What a viewer is told about one person. The user id is never sent.
function publicPerson(entry, origin) {
    const km = origin ? distanceKm(origin.lat, origin.lng, entry.lat, entry.lng) : null;
    return {
        id: String(entry._id),
        firstName: entry.firstName,
        isAuthority: entry.role === "authority" || entry.role === "admin",
        status: entry.status,
        response: entry.response || null,
        lat: entry.lat,
        lng: entry.lng,
        updatedAt: entry.updatedAt,
        distanceKm: km === null ? null : Number(km.toFixed(1)),
    };
}

module.exports = {
    STATUSES,
    RESPONSES,
    STATUS_TTL_SECONDS,
    FRESH_MS,
    LOCATION_STEP,
    DEFAULT_RADIUS_KM,
    MAX_RADIUS_KM,
    MAX_RESULTS,
    approximateLocation,
    distanceKm,
    firstName,
    clampRadius,
    validateShare,
    isFresh,
    publicPerson,
};
