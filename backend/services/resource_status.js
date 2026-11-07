function calculateResourceStatus(total, available, deployed) {
    const quantity = (value) => value === null || value === undefined || value === ""
        ? null
        : Number(value);
    const totalUnits = quantity(total);
    const availableUnits = quantity(available);
    const deployedUnits = quantity(deployed);
    if (!Number.isFinite(totalUnits) || totalUnits <= 0
        || !Number.isFinite(availableUnits) || availableUnits < 0
        || availableUnits > totalUnits) {
        return "Unavailable";
    }
    if (availableUnits === 0) {
        return Number.isFinite(deployedUnits) && deployedUnits > 0
            ? "Deployed"
            : "Unavailable";
    }
    return (availableUnits / totalUnits) * 100 <= 25
        ? "Limited"
        : "Available";
}
module.exports = { calculateResourceStatus };
