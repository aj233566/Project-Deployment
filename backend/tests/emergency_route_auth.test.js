const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const emergencyRoutes = require("../routes/emergency_priority_routes");
const { optionalProtect, protect, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
test("emergency dispatch route requires a token and verified authority/admin authorization", () => {
    const dispatchRoute = emergencyRoutes.stack.find((layer) =>
        layer.route?.path === "/:id/dispatch"
    )?.route;
    assert.ok(dispatchRoute, "dispatch route is registered");
    assert.deepEqual(
        dispatchRoute.stack.map((layer) => layer.name),
        ["protect", "authorizeAuthorityOrAdmin", "dispatchTeam"]
    );
});
test("emergency priority reads retain the optional-auth compatibility contract", () => {
    const readRoute = emergencyRoutes.stack.find((layer) =>
        layer.route?.path === "/"
    )?.route;
    assert.ok(readRoute, "priority read route is registered");
    assert.deepEqual(
        readRoute.stack.map((layer) => layer.name),
        ["optionalProtect", "getPrioritisedAreas"]
    );
});
test("optional priority reads preserve anonymous access and validate supplied sessions", async (t) => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "route-auth-test-secret";
    const runMiddleware = async (middleware, req) => {
        const res = {
            statusCode: 200,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(value) {
                this.body = value;
                return this;
            }
        };
        let nextCalled = false;
        await middleware(req, res, () => { nextCalled = true; });
        return { req, res, nextCalled };
    };
    try {
        const anonymous = await runMiddleware(optionalProtect, { headers: {} });
        assert.equal(anonymous.nextCalled, true);
        const user = { activeSessionId: "active-session" };
        t.mock.method(require("../models/user"), "findById", async () => user);
        const citizenToken = jwt.sign({ userId: "citizen-1", role: "citizen", sessionId: "active-session" }, process.env.JWT_SECRET);
        const citizen = await runMiddleware(optionalProtect, {
            headers: { authorization: `Bearer ${citizenToken}` }
        });
        assert.equal(citizen.nextCalled, true);
        assert.equal(citizen.req.user.role, "citizen");
        const citizenWrite = await runMiddleware(protect, {
            headers: { authorization: `Bearer ${citizenToken}` }
        });
        assert.equal(citizenWrite.nextCalled, true);
        let authorized = false;
        authorizeAuthorityOrAdmin(
            { user: citizenWrite.req.user },
            citizenWrite.res,
            () => { authorized = true; }
        );
        assert.equal(authorized, false);
        assert.equal(citizenWrite.res.statusCode, 403);
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    }
});
