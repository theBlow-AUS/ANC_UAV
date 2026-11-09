const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const M = require('../lib/map-tiles.ts');

test('preset region bounds are valid and cover Australia plus each state and territory', () => {
  assert.equal(M.AUSTRALIA_REGIONS.length, 9);
  for (const region of M.AUSTRALIA_REGIONS) assert.equal(M.isValidTileBounds(region.bounds), true, region.label);
  assert.equal(M.AUSTRALIA_REGIONS[0].id, 'au');
});
test('rejects inverted, out-of-range and non-finite areas', () => {
  assert.equal(M.isValidTileBounds({ west: 2, east: 1, south: 1, north: 2 }), false);
  assert.equal(M.isValidTileBounds({ west: -181, east: 1, south: 1, north: 2 }), false);
  assert.equal(M.isValidTileBounds({ west: 0, east: 1, south: -90, north: 2 }), false);
  assert.equal(M.isValidTileBounds({ west: 0, east: NaN, south: 1, north: 2 }), false);
});
test('tile estimate increases with detail and is bounded for Australian state presets', () => {
  const nsw = M.AUSTRALIA_REGIONS.find(r => r.id === 'nsw').bounds;
  const z6 = M.estimateTileCount(nsw, 6);
  const z8 = M.estimateTileCount(nsw, 8);
  assert.ok(z6 > 0 && z8 > z6);
  assert.ok(M.estimateTileCount(nsw, 14) > z8);
  assert.equal(M.estimateTileCount(nsw, 99), 0);
  assert.equal(M.estimateTileCount(nsw, 8, 9), 0);
});
test('layer styles point to the selected public sources and include attribution', () => {
  assert.equal(M.mapStyle('openfreemap', '2026-11-08'), 'https://tiles.openfreemap.org/styles/liberty');
  const topo = M.mapStyle('topographic', '2026-11-08');
  assert.match(topo.sources.geoscience.tiles[0], /services\.ga\.gov\.au/);
  assert.match(topo.sources.geoscience.attribution, /CC BY 4\.0/);
  const satellite = M.mapStyle('satellite', '2026-11-08');
  assert.match(satellite.sources.nasa.tiles[0], /VIIRS_NOAA21_CorrectedReflectance_TrueColor\/default\/2026-11-08/);
  assert.match(satellite.sources.nasa.attribution, /NASA EOSDIS GIBS/);
});
test('download byte estimate follows source-specific planning ceilings', () => {
  assert.ok(M.estimatedBytes('openfreemap', 100) < M.estimatedBytes('topographic', 100));
  assert.ok(M.estimatedBytes('satellite', 100) > 0);
});
