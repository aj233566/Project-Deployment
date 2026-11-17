const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { login, logout } = require("../controllers/auth_controller");
const { protect } = require("../middlewares/auth_middleware");
function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; }
    };
}
function makeUser(overrides = {}) {
    return {
        _id: "507f1f77bcf86cd799439011",
        name: "Test User",
        email: "user@example.com",
        phone: "1234567890",
        password: bcrypt.hashSync("correct-password", 4),
        role: "citizen",
        location: { state: "State", district: "District" },
        department: "",
        designation: "",
        employeeId: "",
        authorityStatus: "not_applicable",
        activeSessionId: null,
        activeSessionIds: [],
        ...overrides
    };
}
function mockSessionUpdates(t, user) {
    t.mock.method(User, "findOneAndUpdate", async (filter, update) => {
        if (update.$addToSet?.activeSessionIds) {
            const sessions = new Set([...(user.activeSessionIds || []), user.activeSessionId].filter(Boolean));
            const limit = user.maxConcurrentSessions ?? (user.role === "admin" ? 3 : 1);
            if (sessions.size >= limit) return null;
            user.activeSessionIds ||= [];
            user.activeSessionIds.push(update.$addToSet.activeSessionIds);
            Object.assign(user, update.$set || {});
            return user;
        }
        if (update.$pull?.activeSessionIds) {
            if (!(user.activeSessionIds || []).includes(update.$pull.activeSessionIds)) return null;
            user.activeSessionIds = user.activeSessionIds.filter((id) => id !== update.$pull.activeSessionIds);
            Object.assign(user, update.$set || {});
            return user;
        }
        if (update.$set?.activeSessionId === null) {
            if (user.activeSessionId !== filter.activeSessionId) return null;
            user.activeSessionId = null;
            return user;
        }
        throw new Error("Unexpected session update shape");
    });
}
test("concurrent login enforces the per-account cap; protected access and conditional logout work", async (t) => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "single-session-test-secret";
    const user = makeUser();
    t.mock.method(User, "findOne", async () => user);
    t.mock.method(User, "findById", async () => user);
    mockSessionUpdates(t, user);
    try {
        const makeLogin = () => {
            const res = makeResponse();
            return login({ body: { email: " USER@EXAMPLE.COM ", password: "correct-password" } }, res)
                .then(() => res);
        };
        const [first, second] = await Promise.all([makeLogin(), makeLogin()]);
        const accepted = [first, second].find((res) => res.statusCode === 200);
        const rejected = [first, second].find((res) => res.statusCode === 409);
        assert.ok(accepted);
        assert.ok(rejected);
        assert.equal(rejected.body.code, "ACCOUNT_ALREADY_LOGGED_IN");
        assert.match(rejected.body.message, /reached its 1-device sign-in limit/i);
        assert.equal(rejected.body.token, undefined);
        const acceptedSession = jwt.verify(accepted.body.token, process.env.JWT_SECRET).sessionId;
        assert.ok(user.activeSessionIds.includes(acceptedSession));
        const runProtect = async (token) => {
            const res = makeResponse();
            let nextCalled = false;
            await protect({ headers: { authorization: `Bearer ${token}` } }, res, () => { nextCalled = true; });
            return { res, nextCalled };
        };
        const valid = await runProtect(accepted.body.token);
        assert.equal(valid.nextCalled, true);
        const wrongSessionToken = jwt.sign({
            userId: String(user._id), role: user.role, sessionId: "revoked-session"
        }, process.env.JWT_SECRET);
        const invalid = await runProtect(wrongSessionToken);
        assert.equal(invalid.res.statusCode, 401);
        assert.equal(invalid.res.body.code, "SESSION_INVALID");
        assert.ok(user.activeSessionIds.includes(acceptedSession));
        const activeSession = acceptedSession;
        user.activeSessionIds = user.activeSessionIds.filter((id) => id !== activeSession);
        user.activeSessionIds.push("newer-session");
        const staleLogoutRes = makeResponse();
        await logout({ user: { userId: user._id, sessionId: activeSession } }, staleLogoutRes);
        assert.equal(staleLogoutRes.statusCode, 401);
        assert.ok(user.activeSessionIds.includes("newer-session"));
        user.activeSessionIds = user.activeSessionIds.filter((id) => id !== "newer-session");
        user.activeSessionIds.push(activeSession);
        const logoutRes = makeResponse();
        await logout({ user: { userId: user._id, sessionId: activeSession } }, logoutRes);
        assert.equal(logoutRes.statusCode, 200);
        assert.equal(user.activeSessionIds.includes(activeSession), false);
        const afterLogout = await makeLogin();
        assert.equal(afterLogout.statusCode, 200);
        assert.equal(user.activeSessionIds.length, 1);
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    }
});
test("citizen and verified authority retain one-device defaults; admins can use three sessions", async (t) => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "single-session-role-test-secret";
    const user = makeUser();
    t.mock.method(User, "findOne", async () => user);
    mockSessionUpdates(t, user);
    try {
        for (const [role, authorityStatus] of [
            ["citizen", "not_applicable"],
            ["authority", "verified"],
            ["admin", "not_applicable"]
        ]) {
            user.role = role;
            user.authorityStatus = authorityStatus;
            user.activeSessionId = null;
            user.activeSessionIds = [];
            const limit = role === "admin" ? 3 : 1;
            for (let index = 0; index < limit; index += 1) {
                const res = makeResponse();
                await login({ body: { email: user.email, password: "correct-password" } }, res);
                assert.equal(res.statusCode, 200, `${role} session ${index + 1} should be accepted`);
                const claims = jwt.verify(res.body.token, process.env.JWT_SECRET);
                assert.equal(claims.role, role);
                assert.ok(claims.sessionId);
                assert.ok(user.activeSessionIds.includes(claims.sessionId));
            }
            const atLimit = makeResponse();
            await login({ body: { email: user.email, password: "correct-password" } }, atLimit);
            assert.equal(atLimit.statusCode, 409, `${role} should not exceed its device limit`);
        }
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    }
});
test("unverified authority login does not claim a session", async (t) => {
    const user = makeUser({ role: "authority", authorityStatus: "pending" });
    t.mock.method(User, "findOne", async () => user);
    const claim = t.mock.method(User, "findOneAndUpdate", async () => {
        throw new Error("pending authority must not claim a session");
    });
    const res = makeResponse();
    await login({ body: { email: user.email, password: "correct-password" } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.authorityStatus, "pending");
    assert.equal(claim.mock.callCount(), 0);
});
