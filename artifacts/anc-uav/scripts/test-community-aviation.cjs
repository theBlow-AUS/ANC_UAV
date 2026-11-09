// Synthetic engineering fixtures only. No live service or operational approval.
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const A = require('../lib/community-aviation.ts');
const { createCommunityCache } = require('../lib/community-cache.ts');
let fakeFetch;
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'expo/fetch') return { fetch: (...args) => fakeFetch(...args) };
  return original.call(this, name, ...args);
};
const { limitedText, downloadCommunitySnapshot } = require('../lib/community-download.ts');
Module._load = original;
const date = '2026-11-09T12:00:00.000Z', revision = 'a'.repeat(40);
const airportCsv = 'id,ident,type,name,latitude_deg,longitude_deg,iso_country,iso_region\n' +
  '1,YTEST,small_airport,"SYNTHETIC, North",-33,151,AU,AU-NSW\n' +
  '2,YTEST2,closed,SYNTHETIC South,-33.01,151,AU,AU-NSW\n' +
  '3,OTHER,large_airport,Foreign,30,20,NZ,NZ-A\n';
const frequencyCsv = 'id,airport_ref,airport_ident,type,description,frequency_mhz\n' +
  '10,1,YTEST,CTAF,Traffic,123.45\n' +
  '11,1,YTEST,TWR/CTAF,Check tower hours,124.1\n' +
  '12,2,YTEST2,FIA,Area service recorded at airport,125.55\n' +
  '13,1,YTEST,CTAF,Traffic secondary,123.45\n' +
  '14,3,OTHER,CTAF,Foreign,127.1\n';
const snapshot = () => A.buildCommunitySnapshot(airportCsv, frequencyCsv, date, revision);
const clone = x => JSON.parse(JSON.stringify(x));
function storage(raw = null) {
  return { value: raw, writes: 0, failRead: false, failWrite: false,
    async getItem() { if (this.failRead) throw new Error('read failed'); return this.value; },
    async setItem(k, v) { assert.equal(k, A.COMMUNITY_KEY); if (this.failWrite) throw new Error('disk full'); this.value = v; this.writes++; } };
}

test('bundled real Australian data is attributable and contains no invented applicability', () => {
  const bundled = A.validateCommunitySnapshot(require('../data/ourairports-australia.json'));
  assert.ok(bundled.airports.length > 2000);
  assert.ok(bundled.frequencies.length > 3000);
  assert.equal(bundled.publisher, 'OurAirports');
  assert.equal(bundled.licence, 'Public domain');
  assert.match(bundled.revision, /^[a-f0-9]{40}$/);
  for (const f of bundled.frequencies) {
    assert.equal('applicability' in f, false); assert.equal('effectiveFrom' in f, false);
    assert.equal('controlled' in f, false);
  }
});
test('CSV handles quoted commas, escaped quotes, CRLF and newlines; rejects broken payloads', () => {
  const parsed = A.parseCsv('\uFEFFa,b\r\n"hello,""world""","two\nlines"\r\n', ['a', 'b']);
  assert.deepEqual(parsed, [{ a: 'hello,"world"', b: 'two\nlines' }]);
  for (const bad of ['', '<html>login</html>', 'a,b\nx', 'a,b\n"x,y', 'a,b\n"x"junk,y', 'a,a\nx,y'])
    assert.throws(() => A.parseCsv(bad, ['a', 'b']));
  assert.throws(() => A.parseCsv('a,b\n1,2\n3,4', ['a', 'b'], 1));
});
test('Australian joins preserve source text, closed status and decimals, never infer tower status', () => {
  const s = snapshot();
  assert.equal(s.airports.length, 2); assert.equal(s.frequencies.length, 4);
  assert.equal(s.airports[0].name, 'SYNTHETIC, North');
  assert.equal(s.airports[1].sourceType, 'closed');
  assert.equal(s.frequencies[0].frequencyMHz, '123.45');
  assert.equal(s.frequencies[1].sourceType, 'TWR/CTAF');
  assert.ok(!('towerStatus' in s.airports[0]));
});
test('bad coordinates, mismatched joins and bad frequencies are counted, no default frequency', () => {
  const airports = airportCsv + '4,YBAD,small_airport,Bad latitude,999,151,AU,AU-NSW\n';
  const frequencies = frequencyCsv + '15,1,WRONG,CTAF,Wrong airport,126.7\n16,1,YTEST,CTAF,Bad,NaN\n17,4,YBAD,CTAF,Invalid coordinates,123.4\n';
  const s = A.buildCommunitySnapshot(airports, frequencies, date, revision);
  assert.equal(s.rejectedAirports, 1); assert.equal(s.rejectedFrequencies, 3);
  assert.equal(s.frequencies.length, 4);
});
test('conservative CTAF classification preserves mixed, conditional, unknown and incident services', () => {
  const f = (sourceType, description = '', frequencyMHz = '123.45') => ({ id: 'x', airportId: '1', sourceType, description, frequencyMHz });
  assert.equal(A.classifyFrequency(f('ctaf')), 'ctaf');
  assert.equal(A.classifyFrequency(f('TWR/CTAF')), 'conditional');
  assert.equal(A.classifyFrequency(f('MISC', 'CTAF 123.45')), 'conditional');
  assert.equal(A.classifyFrequency(f('CTAF', 'After tower hours')), 'conditional');
  assert.equal(A.classifyFrequency(f('CTAF', '', '450')), 'conditional');
  for (const type of ['FIA', 'UNKNOWN', 'TWR', 'FCTAF']) assert.equal(A.classifyFrequency(f(type)), 'other');
});
test('manual origin finds every nearby airport, retains duplicates and shows true bearing and km/NM basis', () => {
  const s = snapshot();
  const rows = A.searchCommunity(s, { origin: { latitude: -33.005, longitude: 151 }, search: '', radiusKm: 5, group: 'all' });
  assert.equal(rows.length, 4); assert.equal(new Set(rows.map(r => r.airport.id)).size, 2);
  assert.equal(rows.filter(r => r.frequency.frequencyMHz === '123.45').length, 2);
  assert.ok(rows.every(r => r.distanceKm > 0 && r.distanceKm < 1));
  assert.ok(rows.every(r => Math.abs(r.bearingDegrees - 0) < 0.01 || Math.abs(r.bearingDegrees - 180) < 0.01));
  assert.equal(A.searchCommunity(s, { origin: { latitude: 0, longitude: 0 }, search: '', radiusKm: 5, group: 'all' }).length, 0);
});
test('no GPS or permission denial still allows all name/identifier search; no spatial match is claimed', () => {
  const rows = A.searchCommunity(snapshot(), { origin: null, search: 'YTEST', radiusKm: 50, group: 'all' });
  assert.equal(rows.length, 4);
  assert.ok(rows.every(r => r.distanceKm === null && r.bearingDegrees === null));
  assert.equal(A.searchCommunity(snapshot(), { origin: null, search: 'south', radiusKm: null, group: 'other' }).length, 1);
  assert.throws(() => A.searchCommunity(snapshot(), { origin: null, search: '', radiusKm: NaN, group: 'all' }));
});
test('paged results expose every candidate, bounds clamp and no row is silently lost', () => {
  const rows = Array.from({ length: 31 }, (_, i) => i);
  const all = [0, 1, 2, 3].flatMap(p => A.communityPage(rows, p).items);
  assert.deepEqual(all, rows); assert.equal(A.communityPage(rows, 99).page, 3);
  assert.equal(A.communityPage([], 0).pages, 1);
});
test('startup only reads cache, never network; valid prior snapshot works offline', async () => {
  const bundled = snapshot(), saved = { ...snapshot(), retrievedAt: '2026-11-10T00:00:00.000Z' };
  const kv = storage(JSON.stringify(saved)); let calls = 0;
  const cache = createCommunityCache(kv, bundled, async () => { calls++; throw new Error('offline'); });
  await cache.ready;
  assert.equal(calls, 0); assert.equal(cache.get().usingBundled, false);
  assert.equal(cache.get().snapshot.retrievedAt, saved.retrievedAt);
  assert.equal(await cache.refresh(), false); assert.equal(cache.get().snapshot.retrievedAt, saved.retrievedAt);
  assert.equal(kv.writes, 0);
});
test('first launch stays usable in airplane mode from bundled data without attempting a download', async () => {
  const bundled = A.validateCommunitySnapshot(require('../data/ourairports-australia.json'));
  const bundledFrequency = bundled.frequencies[0];
  const bundledAirport = bundled.airports.find(a => a.id === bundledFrequency.airportId);
  assert.ok(bundledAirport);
  let calls = 0;
  const cache = createCommunityCache(storage(), bundled, async () => { calls++; throw new Error('offline'); });
  await cache.ready;
  assert.equal(calls, 0);
  assert.equal(cache.get().ready, true);
  assert.equal(cache.get().usingBundled, true);
  assert.equal(cache.get().snapshot.revision, bundled.revision);
  const rows = A.searchCommunity(cache.get().snapshot, { origin: null, search: bundledAirport.ident, radiusKm: null, group: 'all' });
  assert.ok(rows.some(r => r.frequency.id === bundledFrequency.id));
});
test('failed downloads, parse, malformed, incomplete and disk failures retain last working snapshot', async () => {
  const bundled = snapshot(), kv = storage(JSON.stringify(bundled));
  let next = () => Promise.reject(new Error('interrupted'));
  const cache = createCommunityCache(kv, bundled, () => next()); await cache.ready;
  const before = kv.value;
  assert.equal(await cache.refresh(), false);
  next = async () => ({ ...snapshot(), frequencies: [] }); assert.equal(await cache.refresh(), false);
  next = async () => ({ ...snapshot(), frequencies: snapshot().frequencies.slice(0, 1) }); assert.equal(await cache.refresh(), false);
  next = async () => { throw new Error('malformed CSV'); }; assert.equal(await cache.refresh(), false);
  next = async () => ({ ...snapshot(), retrievedAt: '2026-11-10T01:00:00.000Z' }); kv.failWrite = true;
  assert.equal(await cache.refresh(), false);
  assert.equal(cache.get().snapshot.retrievedAt, date); assert.equal(kv.value, before);
  kv.failWrite = false; assert.equal(await cache.refresh(), true);
  const recovered = createCommunityCache(kv, bundled, async () => { throw new Error('offline'); }); await recovered.ready;
  assert.equal(recovered.get().snapshot.retrievedAt, '2026-11-10T01:00:00.000Z');
});
test('rate-limited GitHub update is reported as failed and preserves the committed snapshot across restart', async () => {
  const bundled = snapshot();
  const committed = { ...snapshot(), retrievedAt: '2026-11-10T00:00:00.000Z' };
  const kv = storage(JSON.stringify(committed));
  const cache = createCommunityCache(kv, bundled, async () => {
    throw new Error('Public data request failed (429).');
  });
  await cache.ready;
  const before = kv.value;
  assert.equal(await cache.refresh(), false);
  assert.equal(cache.get().busy, false);
  assert.match(cache.get().error, /429/);
  assert.match(cache.get().error, /Last working snapshot remains available/);
  assert.equal(cache.get().snapshot.retrievedAt, committed.retrievedAt);
  assert.equal(kv.value, before);
  const restarted = createCommunityCache(kv, bundled, async () => { throw new Error('offline'); });
  await restarted.ready;
  assert.equal(restarted.get().snapshot.retrievedAt, committed.retrievedAt);
  assert.equal(restarted.get().usingBundled, false);
});
test('unread saved data cannot be overwritten by refresh until reload recovers it', async () => {
  const kv = storage(JSON.stringify(snapshot())); kv.failRead = true;
  let calls = 0;
  const cache = createCommunityCache(kv, snapshot(), async () => { calls++; return snapshot(); }); await cache.ready;
  assert.equal(await cache.refresh(), false); assert.equal(calls, 0); assert.equal(kv.writes, 0);
  kv.failRead = false; await cache.reload();
  assert.equal(cache.get().readBlocked, false); assert.equal(await cache.refresh(), true);
});
test('invalid cached fields and unsupported versions fail validation', () => {
  for (const mutate of [
    s => s.version = 99, s => s.airports[0].position.latitude = 999,
    s => s.frequencies[0].frequencyMHz = 'NaN', s => s.frequencies[0].airportId = 'absent',
    s => s.frequencies.push(s.frequencies[0]), s => s.retrievedAt = 'unknown',
  ]) { const s = clone(snapshot()); mutate(s); assert.throws(() => A.validateCommunitySnapshot(s)); }
});
test('bounded streamed downloads reject HTTP, HTML CSV, excessive declared/actual bytes and truncated streams', async () => {
  await assert.rejects(limitedText(new Response('error', { status: 429 }), 100), /429/);
  await assert.rejects(limitedText(new Response('abc', { headers: { 'content-length': '999' } }), 100), /size limit/);
  await assert.rejects(limitedText(new Response('abcdefghijk'), 5), /size limit/);
  await assert.rejects(limitedText(new Response(new ReadableStream({ start(c) { c.error(new Error('interrupted')); } })), 100), /interrupted/);
});
test('update uses fixed public hosts and the same revision for both CSVs without credentials', async () => {
  const urls = [];
  fakeFetch = async (url, opts) => {
    urls.push(url); assert.equal(opts.credentials, 'omit'); assert.equal(opts.redirect, 'error');
    if (url.includes('api.github.com')) return new Response(JSON.stringify({ object: { sha: revision } }));
    assert.ok(url.startsWith(`https://raw.githubusercontent.com/davidmegginson/ourairports-data/${revision}/`));
    return new Response(url.endsWith('/airports.csv') ? airportCsv : frequencyCsv);
  };
  const s = await downloadCommunitySnapshot();
  assert.equal(urls.length, 3); assert.equal(s.revision, revision);
  fakeFetch = async () => new Response('<html>blocked</html>');
  await assert.rejects(downloadCommunitySnapshot());
  fakeFetch = async () => new Response(JSON.stringify({ object: { sha: 'evil/endpoint' } }));
  await assert.rejects(downloadCommunitySnapshot(), /revision/);
});
