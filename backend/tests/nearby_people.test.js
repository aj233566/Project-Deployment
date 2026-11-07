const test = require("node:test");
const assert = require("node:assert/strict");
const people = require("../services/nearbyPeople");

test("the place is rounded to about 100 m and bad places are refused", () => {
    const place = people.approximateLocation(28.612345, 77.209876);
    assert.deepEqual(place, { lat: 28.612, lng: 77.21 });
    assert.ok(people.distanceKm(28.612345, 77.209876, place.lat, place.lng) < 0.15);
    assert.equal(people.approximateLocation("abc", 1), null);
    assert.equal(people.approximateLocation(120, 10), null);
    assert.equal(people.approximateLocation(undefined, undefined), null);
    assert.equal(people.approximateLocation("", ""), null);
});

test("only a plain first name is shown, with a safe fallback", () => {
    assert.equal(people.firstName("Sampad Koley"), "Sampad");
    assert.equal(people.firstName("<b>Evil</b> Name"), "b");
    assert.equal(people.firstName(""), "Neighbour");
    assert.equal(people.firstName(undefined), "Neighbour");
});

test("the radius has a default and a ceiling", () => {
    assert.equal(people.clampRadius(undefined), people.DEFAULT_RADIUS_KM);
    assert.equal(people.clampRadius(-1), people.DEFAULT_RADIUS_KM);
    assert.equal(people.clampRadius(5), 5);
    assert.equal(people.clampRadius(100000), people.MAX_RADIUS_KM);
});

test("sharing needs a real place; an unknown status falls back to plain sharing", () => {
    assert.equal(people.validateShare({ lat: 28.6, lng: 77.2, status: "need-help" }).value.status, "need-help");
    assert.equal(people.validateShare({ lat: 28.6, lng: 77.2, status: "hacked" }).value.status, "sharing");
    assert.equal(people.validateShare({ lat: "x", lng: 77.2 }).ok, false);
    assert.equal(people.validateShare(null).ok, false);
});

test("an entry that was not refreshed for a few minutes counts as gone", () => {
    const now = Date.now();
    assert.equal(people.isFresh({ updatedAt: new Date(now - 30000) }, now), true);
    assert.equal(people.isFresh({ updatedAt: new Date(now - people.FRESH_MS - 1000) }, now), false);
});

test("what a viewer is told never includes the account id", () => {
    const entry = { _id: "e1", user: "secret-user-id", firstName: "Asha", role: "citizen", status: "safe", lat: 28.612, lng: 77.21, updatedAt: new Date() };
    const view = people.publicPerson(entry, { lat: 28.612, lng: 77.21 });
    assert.equal(view.distanceKm, 0);
    assert.equal(view.isAuthority, false);
    assert.ok(!("user" in view));
    assert.equal(people.publicPerson({ ...entry, role: "authority" }, null).isAuthority, true);
    assert.equal(people.publicPerson(entry, null).distanceKm, null);
});

test("an authority answer is one of the known words and is part of what a viewer sees", () => {
    assert.deepEqual(people.RESPONSES, ["on-the-way", "noted"]);
    const entry = { _id: "e2", firstName: "Ravi", role: "citizen", status: "need-help", response: "on-the-way", lat: 28.6, lng: 77.2, updatedAt: new Date() };
    assert.equal(people.publicPerson(entry, null).response, "on-the-way");
    assert.equal(people.publicPerson({ ...entry, response: undefined }, null).response, null);
});
