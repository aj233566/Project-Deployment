const RED_ZONE_RULES = Object.freeze([
    { minimum: 75, zone: "RED" },
    { minimum: 50, zone: "ORANGE" },
    { minimum: 25, zone: "YELLOW" },
    { minimum: 0, zone: "GREEN" }
]);
module.exports = { RED_ZONE_RULES };
