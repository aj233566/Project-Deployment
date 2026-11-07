const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBroadcast, MESSAGE_MAX } = require("../services/broadcastInput");

test("a broadcast needs a message; the title falls back to a default", () => {
    assert.equal(validateBroadcast({}).ok, false);
    assert.equal(validateBroadcast(null).ok, false);
    assert.equal(validateBroadcast({ message: "   " }).ok, false);
    assert.equal(validateBroadcast({ message: ["a"] }).ok, false);
    const ok = validateBroadcast({ message: "Move to the shelter" });
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.value.title, { en: "Notification", hi: "Notification" });
    assert.deepEqual(ok.value.message, { en: "Move to the shelter", hi: "Move to the shelter" });
    assert.equal(ok.value.channel, "in_app");
    assert.equal(ok.value.targetAudience, "General Public");
});

test("both the plain and the {en, hi} forms work, and long or odd text is cleaned", () => {
    const both = validateBroadcast({ title: { en: "Flood", hi: "बाढ़" }, message: { en: "Leave now" } });
    assert.equal(both.value.title.hi, "बाढ़");
    assert.equal(both.value.message.hi, "Leave now");
    const long = validateBroadcast({ message: "x".repeat(MESSAGE_MAX + 500) });
    assert.equal(long.value.message.en.length, MESSAGE_MAX);
    assert.equal(validateBroadcast({ message: "a\u0000b" }).value.message.en, "ab");
});

test("unknown channel or type is refused, known ones are kept", () => {
    assert.equal(validateBroadcast({ message: "m", channel: "pigeon" }).ok, false);
    assert.equal(validateBroadcast({ message: "m", type: { $ne: 1 } }).ok, false);
    const ok = validateBroadcast({ message: "m", channel: "sms", type: "critical", targetAudience: "Authority" });
    assert.equal(ok.value.channel, "sms");
    assert.equal(ok.value.type, "critical");
    assert.equal(ok.value.targetAudience, "Authority");
});
