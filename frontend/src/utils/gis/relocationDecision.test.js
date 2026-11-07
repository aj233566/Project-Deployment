import test from 'node:test';
import assert from 'node:assert/strict';
import {
  straightLineKm,
  bearing,
  siteAvailableCapacity,
  rankRelocationSites,
  bestRelocationSite,
} from './relocationDecision.js';
const hab = (lng, lat, population) => ({ location: { coordinates: [lng, lat] }, population });
const site = (id, lng, lat, capacity, occupancy) => ({ _id: id, name: id, location: { coordinates: [lng, lat] }, capacity, occupancy });
test('straightLineKm matches a known separation (~1 deg lat ≈ 111 km)', () => {
  const d = straightLineKm({ lat: 27.0, lng: 88.0 }, { lat: 28.0, lng: 88.0 });
  assert.ok(Math.abs(d - 111.19) < 0.5, `got ${d}`);
  assert.equal(straightLineKm(null, { lat: 1, lng: 1 }), null);
});
test('bearing returns degrees and a compass octant', () => {
  assert.equal(bearing({ lat: 27, lng: 88 }, { lat: 28, lng: 88 }).compass, 'N');
  assert.equal(bearing({ lat: 27, lng: 88 }, { lat: 27, lng: 89 }).compass, 'E');
});
test('siteAvailableCapacity = total minus occupancy minus reserved, floored at 0', () => {
  assert.equal(siteAvailableCapacity({ capacity: 200, occupancy: 50 }), 150);
  assert.equal(siteAvailableCapacity({ totalCapacity: 200, occupancy: 50, reservedCapacity: 30 }), 120);
  assert.equal(siteAvailableCapacity({ totalCapacity: 100, occupancy: 120 }), 0);
  assert.equal(siteAvailableCapacity({ totalCapacity: 80 }), 80);                                        
  assert.equal(siteAvailableCapacity({}), null);
});
test('ranking puts a can-absorb nearer site ahead of a closer-but-full site', () => {
  const h = hab(88.0, 27.0, 300);
  const full = site('full-near', 88.0, 27.02, 300, 300);                       
  const fits = site('fits-far', 88.0, 27.1, 500, 100);                                
  const ranked = rankRelocationSites(h, [full, fits]);
  assert.equal(ranked[0].site._id, 'fits-far');
  assert.equal(ranked[0].canAbsorb, true);
  assert.equal(ranked[1].site._id, 'full-near');
  assert.equal(ranked[1].availableCapacity, 0);
});
test('among sites that all fit, the nearest wins', () => {
  const h = hab(88.0, 27.0, 100);
  const near = site('near', 88.0, 27.03, 500, 0);
  const far = site('far', 88.0, 27.3, 500, 0);
  assert.equal(bestRelocationSite(h, [far, near]).site._id, 'near');
});
test('gracefully handles missing habitation point or empty sites', () => {
  assert.deepEqual(rankRelocationSites({ population: 10 }, [site('a', 88, 27, 50, 0)]), []);
  assert.deepEqual(rankRelocationSites(hab(88, 27, 10), []), []);
  assert.equal(bestRelocationSite(hab(88, 27, 10), []), null);
});
