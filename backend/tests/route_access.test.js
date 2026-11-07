const test = require("node:test");
const assert = require("node:assert/strict");
const { protect } = require("../middlewares/auth_middleware");

// Every route of these routers must pass through the sign-in check (`protect`), either as router-level middleware or on the route itself.
// This guards against a router being mounted with no check at all, which is how /api/resources used to be open to anyone.
function unprotectedRoutes(router) {
    const routerLevelProtect = router.stack.some((layer) => !layer.route && layer.handle === protect);
    const open = [];
    for (const layer of router.stack) {
        if (!layer.route) continue;
        const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
        const protectedHere = routerLevelProtect || layer.route.stack.some((inner) => inner.handle === protect);
        if (!protectedHere) open.push(methods + " " + layer.route.path);
    }
    return open;
}

for (const [name, file] of [
    ["resources", "../routes/resource_routes"],
    ["nearby people", "../routes/nearby_routes"],
    ["affected areas", "../routes/affected_area_routes"],
    ["presence", "../routes/presence_routes"],
    ["red zones", "../routes/red_zone_routes"],
    ["relocation sites", "../routes/relocation_site_routes"],
    ["habitations", "../routes/habitation_routes"],
    ["notifications", "../routes/notification_routes"],
    ["alerts", "../routes/alert_routes"],
    ["relocation priority", "../routes/relocation_priority_routes"],
    ["feeds", "../routes/feed_routes"],
]) {
    test(`${name}: every route needs a signed-in account`, () => {
        const router = require(file);
        assert.ok(router.stack.length > 0);
        assert.deepEqual(unprotectedRoutes(router), []);
    });
}
