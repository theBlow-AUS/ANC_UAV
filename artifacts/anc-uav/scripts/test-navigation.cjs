// Deterministic local calculation/contract tests, no servers or device services.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNavigationPack } = require('../data/navigation-pack.ts');
const { distanceKm, initialBearingDegrees, kmToNm, nmToKm, parseCoordinate } = require('../lib/geo.ts');
const { frequencyApplicability, lookupFrequencies, nearbyPlaces, insideRing, sourceStatus, coordinateToMap, mapToCoordinate, parseQueryUtc } = require('../lib/navigation.ts');
const reference = parseNavigationPack(require('../data/australia-reference.json'));
// All aviation records below are synthetic engineering fixtures. Never bundled.
const provenance = {
  ...reference.provenance, publisher: 'SYNTHETIC TEST ONLY',
  effectiveFrom: '2026-11-01T00:00:00Z', effectiveTo: '2026-12-01T00:00:00Z',
};
const p = { latitude: -33, longitude: 151 };
const q = { position: p, altitude: 400, altitudeReference: 'AMSL', utc: '2026-11-09T12:00:00Z' };
const frequency = {
  id: 'ctaf', label: 'SYNTHETIC TEST — NOT FOR USE', service: 'CTAF', frequencyMHz: '123.450',
  aerodromeId: 'test-ad', provenance,
  applicability: { area: { kind: 'circle', centre: p, radiusKm: 20 },
    altitude: { reference: 'AMSL', lower: 0, upper: 5000 }, activeUtc: [], condition: '' },
};
const clone = x => JSON.parse(JSON.stringify(x));
function pack(id = 'synthetic-only') {
  return { ...clone(reference), id, provenance,
    places: [{ id: 'test-ad', name: 'SYNTHETIC', position: p, kind: 'uncontrolled', provenance, statusNote: 'Test fixture only' }],
    frequencies: [clone(frequency)],
    coverage: { ...reference.coverage, aerodromes: 'partial', frequencies: 'partial' },
  };
}

test('bundled map is lawful reference with no fabricated aviation records', () => {
  assert.equal(reference.provenance.licence, 'Public domain');
  assert.equal(reference.coverage.frequencies, 'absent');
  assert.equal(reference.coverage.aerodromes, 'absent');
  assert.equal(reference.frequencies.length, 0);
  assert.ok(reference.places.length > 20);
  assert.ok(reference.places.every(p => p.kind === 'locality'));
  assert.equal(sourceStatus(reference.provenance, q.utc), 'VALIDITY NOT SUPPLIED');
});
test('distance, true bearing and unit conversions', () => {
  assert.equal(distanceKm(p, p), 0);
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < .001);
  assert.equal(initialBearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }), 90);
  assert.equal(initialBearingDegrees(p, { ...p, latitude: -32 }), 0);
  assert.equal(kmToNm(1.852), 1);
  assert.equal(nmToKm(10), 18.52);
  assert.ok(distanceKm({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }) < 23);
  assert.ok(Number.isFinite(distanceKm({ latitude: 89.99, longitude: 0 }, { latitude: 89.99, longitude: 180 })));
});
test('invalid or missing coordinates never become an origin', () => {
  for (const [lat, lon] of [['', '151'], ['NaN', '151'], ['91', '151'], ['-33', '181']]) assert.equal(parseCoordinate(lat, lon), null);
  assert.deepEqual(parseCoordinate('-33', '151'), p);
});
test('map projection round trips at edges and interior', () => {
  for (const point of [p, { latitude: -45, longitude: 112 }, { latitude: -9, longitude: 155 }]) {
    const pixel = coordinateToMap(point, reference.bounds, 375, 310);
    const back = mapToCoordinate(pixel.x, pixel.y, reference.bounds, 375, 310);
    assert.ok(Math.abs(point.latitude - back.latitude) < 1e-10);
    assert.ok(Math.abs(point.longitude - back.longitude) < 1e-10);
  }
});
test('nearest place calculation is ordered and carries provenance', () => {
  const results = nearbyPlaces(reference, { latitude: -33.8688, longitude: 151.2093 });
  assert.equal(results[0].name, 'Sydney');
  assert.ok(results[0].kilometres < 5);
  assert.ok(results.every((r, i) => i === 0 || r.kilometres >= results[i - 1].kilometres));
  assert.ok(results.every(r => r.provenance.source));
});
test('circle geographic applicability, including centre', () => {
  assert.equal(frequencyApplicability(frequency, q).state, 'matches');
  assert.equal(frequencyApplicability(frequency, { ...q, position: { latitude: -34, longitude: 151 } }).state, 'outside');
});
test('polygon interior, edge, vertex and exterior', () => {
  const ring = [{ latitude: -34, longitude: 150 }, { latitude: -32, longitude: 150 }, { latitude: -32, longitude: 152 }, { latitude: -34, longitude: 152 }];
  assert.equal(insideRing(p, ring), true);
  assert.equal(insideRing({ latitude: -33, longitude: 150 }, ring), true);
  assert.equal(insideRing(ring[0], ring), true);
  assert.equal(insideRing({ latitude: -31, longitude: 151 }, ring), false);
  const f = clone(frequency); f.applicability.area = { kind: 'polygon', ring };
  assert.equal(frequencyApplicability(f, q).state, 'matches');
});
test('altitude band includes endpoints but not outside band', () => {
  for (const altitude of [0, 5000]) assert.equal(frequencyApplicability(frequency, { ...q, altitude }).state, 'matches');
  for (const altitude of [-1, 5001]) assert.equal(frequencyApplicability(frequency, { ...q, altitude }).state, 'outside');
});
test('unknown position/altitude and datum mismatch are possible, not clear', () => {
  for (const change of [{ position: null }, { altitude: null }, { altitudeReference: 'AGL' }, { altitudeReference: 'FL' }])
    assert.equal(frequencyApplicability(frequency, { ...q, ...change }).state, 'possible');
});
test('UTC intervals are start-inclusive, end-exclusive and respect timezone offsets', () => {
  const f = clone(frequency); f.applicability.activeUtc = [{ from: '2026-11-09T12:00:00Z', to: '2026-11-09T13:00:00Z' }];
  assert.equal(frequencyApplicability(f, q).state, 'matches');
  assert.equal(frequencyApplicability(f, { ...q, utc: '2026-11-09T23:00:00+11:00' }).state, 'matches');
  assert.equal(frequencyApplicability(f, { ...q, utc: '2026-11-09T13:00:00Z' }).state, 'outside');
});
test('unknown/invalid calendar time is possible and never local-time inferred', () => {
  for (const utc of ['invalid', '2026-11-09T12:00:00', '2026-02-30T12:00:00Z']) {
    assert.ok(Number.isNaN(parseQueryUtc(utc)));
    assert.equal(frequencyApplicability(frequency, { ...q, utc }).state, 'possible');
  }
});
test('source freshness, future dates, missing validity and conditions remain uncertain', () => {
  for (const change of [{ effectiveFrom: null }, { effectiveTo: '2026-11-08T00:00:00Z' }, { effectiveFrom: '2026-11-10T00:00:00Z' }]) {
    const f = clone(frequency); Object.assign(f.provenance, change);
    assert.equal(frequencyApplicability(f, q).state, 'possible');
  }
  const f = clone(frequency); f.applicability.condition = 'Only when tower closed — check operator';
  assert.equal(frequencyApplicability(f, q).state, 'possible');
});
test('expired schedules cannot conclusively exclude candidate frequencies', () => {
  const f = clone(frequency);
  f.provenance.effectiveTo = '2026-11-08T00:00:00Z';
  f.applicability.activeUtc = [{ from: '2026-11-07T12:00:00Z', to: '2026-11-07T13:00:00Z' }];
  assert.equal(frequencyApplicability(f, q).state, 'possible');
});
test('every installed pack and overlapping service is searched without deduplicating frequencies', () => {
  const a = pack('a'), b = pack('b');
  a.frequencies.push({ ...clone(frequency), id: 'broadcast', service: 'BROADCAST', aerodromeId: undefined });
  b.frequencies.push({ ...clone(frequency), id: 'centre', service: 'CENTRE', aerodromeId: undefined });
  const rows = lookupFrequencies([reference, a, b], q);
  assert.equal(rows.length, 4);
  assert.ok(rows.every(r => r.state === 'matches'));
  a.provenance.effectiveTo = '2026-11-08T00:00:00Z';
  assert.equal(lookupFrequencies([a], q)[0].state, 'possible');
});
test('strict contract rejects self-approved content, FCTAF inference and bad references', () => {
  assert.doesNotThrow(() => parseNavigationPack(pack()));
  for (const mutate of [
    p => { p.approved = true; },
    p => { p.frequencies[0].service = 'FCTAF'; },
    p => { p.frequencies[0].aerodromeId = 'missing'; },
    p => { p.frequencies[0].frequencyMHz = '999.000'; },
    p => { p.frequencies[0].applicability.altitude.reference = 'GPS'; },
    p => { p.frequencies[0].provenance.rightsReference = ''; },
    p => { p.frequencies[0].provenance.effectiveTo = '2020-01-01T00:00:00Z'; },
    p => { p.frequencies.push(clone(p.frequencies[0])); },
    p => { p.coverage.frequencies = 'absent'; },
    p => { p.bounds.west = 170; p.bounds.east = -170; },
    p => { p.frequencies[0].applicability.area = { kind: 'polygon', ring: [{ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 }, { latitude: 1, longitude: 179 }] }; },
  ]) {
    const value = pack(); mutate(value);
    assert.throws(() => parseNavigationPack(value));
  }
});
