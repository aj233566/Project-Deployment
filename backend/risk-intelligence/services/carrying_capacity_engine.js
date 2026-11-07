function calculateCarryingCapacity(site, requestedPopulation = null) {
    const valueOrNaN = (value) => value === null || value === undefined || value === ""
        ? NaN
        : Number(value);
    const total = valueOrNaN(site.totalCapacity);
    const occupied = valueOrNaN(site.occupancy);
    const reserved = valueOrNaN(site.reservedCapacity);
    const required = requestedPopulation === null || requestedPopulation === undefined
        ? null
        : requestedPopulation;
    if (!Number.isFinite(total) || total < 0
        || (required !== null && (!Number.isFinite(required) || required < 0))) {
        throw new TypeError("Capacity values must be finite non-negative numbers.");
    }
    if (![occupied, reserved].every((value) => Number.isFinite(value) && value >= 0)) {
        return {
            required,
            total,
            occupied: Number.isFinite(occupied) ? occupied : null,
            reserved: Number.isFinite(reserved) ? reserved : null,
            available: null,
            capacityGap: null,
            canAccommodate: null
        };
    }
    if (occupied + reserved > total) {
        throw new RangeError("Occupied and reserved capacity cannot exceed total capacity.");
    }
    const available = total - occupied - reserved;
    return {
        required,
        total,
        occupied,
        reserved,
        available,
        capacityGap: required === null ? null : Math.max(0, required - available),
        canAccommodate: required === null ? null : available >= required
    };
}
module.exports = { calculateCarryingCapacity };
