const test = require("node:test");
const assert = require("node:assert/strict");
const { checkPrototypeReset } = require("../services/passwordResetPolicy");

test("a citizen can use the prototype reset outside production", () => {
    assert.deepEqual(checkPrototypeReset({ user: { role: "citizen" }, env: { NODE_ENV: "development" } }), { allowed: true });
    assert.deepEqual(checkPrototypeReset({ user: { role: "citizen" }, env: {} }), { allowed: true });
});

test("authority and admin accounts are never reset this way", () => {
    for (const role of ["authority", "admin"]) {
        const result = checkPrototypeReset({ user: { role }, env: { NODE_ENV: "development" } });
        assert.equal(result.allowed, false, role);
        assert.equal(result.status, 403);
        assert.match(result.message, /administrator/i);
    }
});

test("in production it is off unless it is switched on on purpose", () => {
    const off = checkPrototypeReset({ user: { role: "citizen" }, env: { NODE_ENV: "production" } });
    assert.equal(off.allowed, false);
    assert.equal(off.status, 403);
    assert.equal(checkPrototypeReset({ user: { role: "citizen" }, env: { NODE_ENV: "production", ALLOW_PASSWORD_RESET_PROTOTYPE: "true" } }).allowed, true);
    assert.equal(checkPrototypeReset({ user: { role: "admin" }, env: { NODE_ENV: "production", ALLOW_PASSWORD_RESET_PROTOTYPE: "true" } }).allowed, false);
});
