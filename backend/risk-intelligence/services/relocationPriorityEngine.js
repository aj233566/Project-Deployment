const PRIORITY_ORDER = { IMMEDIATE: 0, SHORT_TERM: 1, MEDIUM_TERM: 2, MONITOR: 3, UNASSESSED: 4 };
function assessRelocationPriority(habitation, sites = []) {
    const score = Number.isFinite(habitation.risk?.score) ? habitation.risk.score : null;
    const redZone = habitation.risk?.level || "UNKNOWN";
    const vulnerableGroups = habitation.vulnerableGroups || {};
    const vulnerableGroupKeys = ["elderly", "children", "peopleWithDisabilities", "pregnantPeople", "other"];
    const vulnerableCounts = vulnerableGroupKeys.map((key) => vulnerableGroups[key]);
    const vulnerablePopulation = vulnerableCounts.every((count) => Number.isFinite(count))
        ? vulnerableCounts.reduce((sum, count) => sum + count, 0)
        : null;
    const population = Number.isFinite(habitation.population)
        ? habitation.population
        : null;
    const priority = score === null && redZone === "UNKNOWN"
        ? "UNASSESSED"
        : redZone === "RED" || (score !== null && score >= 75)
        ? "IMMEDIATE"
        : redZone === "ORANGE" || (score !== null && score >= 50)
            ? "SHORT_TERM"
            : redZone === "YELLOW" || (score !== null && score >= 25)
                ? "MEDIUM_TERM"
                : "MONITOR";
    const candidates = sites
        .filter((site) => site.status === "ACTIVE")
        .map((site) => {
            if (!habitation.location?.coordinates || !site.location?.coordinates) {
                return {
                    siteId: String(site._id),
                    name: site.name,
                    available: capacityAvailable(site),
                    suitability: Number.isFinite(site.suitability) ? site.suitability : null,
                    hazardSafe: false,
                    roadAccess: site.roadAccess,
                    distanceKm: null,
                    reason: "Location is missing; distance/safety cannot be assessed.",
                    usable: false
                };
            }
            const available = capacityAvailable(site);
            const suitability = Number.isFinite(site.suitability) ? site.suitability : null;
            const primaryHazard = String(habitation.primaryHazard || "").toLowerCase();
            const hazardSafe = Boolean(primaryHazard)
                && !(site.hazardExposure || []).includes(primaryHazard);
            const roadSafe = site.roadAccess === "OPEN";
            const usable = available !== null && available > 0 && hazardSafe && roadSafe && suitability !== null && suitability >= 50;
            const [habitationLng, habitationLat] = habitation.location.coordinates;
            const [siteLng, siteLat] = site.location.coordinates;
            return {
                siteId: String(site._id),
                name: site.name,
                available,
                suitability,
                hazardSafe,
                roadAccess: site.roadAccess,
                distanceKm: calculateDistanceKm(habitationLat, habitationLng, siteLat, siteLng),
                reason: usable ? "Open access, available capacity, and recorded suitability meet decision rules."
                    : !primaryHazard ? "No assessed primary hazard is recorded; safety cannot be confirmed."
                        : "Site is not a confirmed safe candidate; verify access, hazard exposure, capacity, and suitability.",
                usable
            };
        })
        .sort((a, b) => Number(b.usable) - Number(a.usable)
            || (b.suitability ?? -1) - (a.suitability ?? -1)
            || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
            || b.available - a.available);
    return {
        habitationId: String(habitation._id),
        priority,
        score,
        redZone,
        population,
        vulnerablePopulation,
        candidates,
        capacityGap: priority === "UNASSESSED" || population === null
            ? null
            : Math.max(0, population - candidates.filter((site) => site.usable).reduce((sum, site) => sum + site.available, 0))
    };
}
function capacityAvailable(site) {
    if (![site.totalCapacity, site.occupancy, site.reservedCapacity].every(Number.isFinite)) {
        return null;
    }
    return Math.max(0, site.totalCapacity - site.occupancy - site.reservedCapacity);
}
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const radians = (value) => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
function sortPriorities(items) {
    return items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        || (b.score ?? -1) - (a.score ?? -1));
}
module.exports = { assessRelocationPriority, sortPriorities };
