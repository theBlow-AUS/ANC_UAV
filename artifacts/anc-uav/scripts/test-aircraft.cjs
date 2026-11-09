// Aircraft distance store, validation and layout. Local fakes only; no network.
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const originalLoad = Module._load;
const mem = new Map();
const asyncStorage = { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } };
Module._load = function(name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: asyncStorage };
  if (name === 'react') return { useSyncExternalStore: () => null };
  return originalLoad.call(this, name, ...args);
};
const A = require('../lib/aircraft.ts');
const { createAircraftStore } = require('../lib/aircraft-store.ts');
Module._load = originalLoad;

function fakeKV(init = {}) {
  const data = new Map(Object.entries(init));
  const kv = { data, failWrites: false, failReads: false, writes: 0,
    async getItem(k) { if (kv.failReads) throw new Error('read'); return data.get(k) ?? null; },
    async setItem(k, v) { await new Promise((r) => setTimeout(r, Math.random() * 3)); if (kv.failWrites) throw new Error('write'); kv.writes++; data.set(k, v); } };
  return kv;
}
const names = (s) => s.get().aircraft.map((a) => a.name);
const UI_KEY = 'anc-uav.ui.v1';

test('upgrade seeds the three defaults once and leaves preferences alone', async () => {
  const prefs = JSON.stringify({ theme: 'night', text: 1.3, unit: 'nm', crew: 'multi', contacts: [] });
  const kv = fakeKV({ [UI_KEY]: prefs });
  const s = createAircraftStore(kv); await s.ready;
  assert.deepEqual(names(s), ['Mini', 'M30T', 'Matrice 4/5T']);
  assert.deepEqual(s.get().aircraft.map((a) => a.distanceM), [500, 1000, 800]);
  assert.equal(kv.data.get(UI_KEY), prefs);
  await s.update(s.get().aircraft[0].id, { name: 'Mini 4 Pro', distanceM: 450.5, source: 'OM v2' });
  const s2 = createAircraftStore(kv); await s2.ready;
  assert.deepEqual(names(s2), ['Mini 4 Pro', 'M30T', 'Matrice 4/5T']);
  assert.equal(s2.get().aircraft[0].distanceM, 450.5);
});

test('empty list survives restart, never re-seeded', async () => {
  const kv = fakeKV(); const s = createAircraftStore(kv); await s.ready;
  for (const a of [...s.get().aircraft]) assert.equal((await s.remove(a.id)).ok, true);
  assert.equal(s.get().aircraft.length, 0);
  const s2 = createAircraftStore(kv); await s2.ready;
  assert.equal(s2.get().aircraft.length, 0);
  assert.equal(s2.get().loadError, null);
});

test('corrupt storage reports error, does not overwrite or seed', async () => {
  const kv = fakeKV({ [A.AIRCRAFT_KEY]: '{not json' });
  const s = createAircraftStore(kv); await s.ready;
  assert.equal(s.get().aircraft.length, 0);
  assert.match(s.get().loadError, /unreadable/);
  assert.equal(kv.data.get(A.AIRCRAFT_KEY), '{not json');
  const partial = A.loadDoc(JSON.stringify({ version: 1, aircraft: [{ id: 'a', name: 'X', distanceM: 10, source: '' }, { id: 'b', name: '', distanceM: 5 }, { id: 'c', name: 'Y', distanceM: -1 }, null] }));
  assert.equal(partial.doc.aircraft.length, 1);
  assert.match(partial.error, /3 saved aircraft entries/);
});

test('read failure surfaces error', async () => {
  const kv = fakeKV(); kv.failReads = true;
  const s = createAircraftStore(kv); await s.ready;
  assert.ok(s.get().hydrated); assert.ok(s.get().loadError);
});

test('failed initial read blocks every mutation until reload restores existing aircraft', async () => {
  const saved = A.serialize([{ id: 'existing', name: 'Operator aircraft', distanceM: 675, source: 'OM v4' }]);
  const kv = fakeKV({ [A.AIRCRAFT_KEY]: saved }); kv.failReads = true;
  const s = createAircraftStore(kv); await s.ready;
  assert.equal(s.get().readBlocked, true);
  assert.equal((await s.add({ name: 'New', distanceM: 500, source: '' })).ok, false);
  assert.equal((await s.update('existing', { name: 'Changed', distanceM: 1, source: '' })).ok, false);
  assert.equal((await s.remove('existing')).ok, false);
  assert.equal(kv.data.get(A.AIRCRAFT_KEY), saved);
  assert.equal(kv.writes, 0);
  kv.failReads = false;
  await s.reload();
  assert.equal(s.get().readBlocked, false);
  assert.deepEqual(names(s), ['Operator aircraft']);
  assert.equal((await s.add({ name: 'New', distanceM: 500, source: '' })).ok, true);
  const reloaded = createAircraftStore(kv); await reloaded.ready;
  assert.deepEqual(names(reloaded), ['Operator aircraft', 'New']);
});

test('failed saves keep the old saved list and never report success', async () => {
  const kv = fakeKV(); const s = createAircraftStore(kv); await s.ready;
  const before = kv.data.get(A.AIRCRAFT_KEY);
  kv.failWrites = true;
  let emitted = 0; s.subscribe(() => emitted++);
  const r1 = await s.add({ name: 'Avata', distanceM: 300, source: '' });
  const r2 = await s.remove(s.get().aircraft[0].id);
  const r3 = await s.update(s.get().aircraft[1].id, { name: 'Z', distanceM: 1, source: '' });
  for (const r of [r1, r2, r3]) { assert.equal(r.ok, false); assert.ok(r.error); }
  assert.equal(emitted, 0);
  assert.deepEqual(names(s), ['Mini', 'M30T', 'Matrice 4/5T']);
  assert.equal(kv.data.get(A.AIRCRAFT_KEY), before);
  kv.failWrites = false;
  assert.equal((await s.add({ name: 'Avata', distanceM: 300, source: '' })).ok, true);
});

test('interleaved saves serialise; ui preference key is never touched', async () => {
  const prefs = JSON.stringify({ theme: 'day' });
  const kv = fakeKV({ [UI_KEY]: prefs }); const s = createAircraftStore(kv); await s.ready;
  const ids = s.get().aircraft.map((a) => a.id);
  await Promise.all([
    s.add({ name: 'A1', distanceM: 1, source: '' }), s.remove(ids[1]),
    s.add({ name: 'A2', distanceM: 2.25, source: '' }), s.update(ids[0], { name: 'Mini X', distanceM: 501, source: '' }),
    kv.setItem(UI_KEY, JSON.stringify({ theme: 'night' })),
  ]);
  assert.deepEqual(names(s), ['Mini X', 'Matrice 4/5T', 'A1', 'A2']);
  const s2 = createAircraftStore(kv); await s2.ready;
  assert.deepEqual(names(s2), names(s));
  assert.equal(kv.data.get(UI_KEY), JSON.stringify({ theme: 'night' }));
});

test('validation rejects blanks and bad numbers, accepts decimals', () => {
  for (const d of ['', ' ', '0', '-5', 'NaN', 'Infinity', '1e999', 'abc', '0.0']) assert.equal(A.validateDraft({ name: 'X', distance: d, source: '' }).ok, false, d);
  assert.equal(A.validateDraft({ name: '   ', distance: '500', source: '' }).ok, false);
  const ok = A.validateDraft({ name: '  Matrice   4/5T ', distance: '812.5', source: ' OM v3 ' });
  assert.deepEqual(ok, { ok: true, value: { name: 'Matrice 4/5T', distanceM: 812.5, source: 'OM v3' } });
  assert.equal(A.parseDistance('812,75'), 812.75);
  assert.equal(A.parseDistance('0.001'), 0.001);
  assert.equal(A.formatMetres(0.001), '0.001');
  assert.ok(A.loadDoc(JSON.stringify({ version: 99, aircraft: [] })).error);
  assert.equal(A.formatMetres(812.5), '812.5'); assert.equal(A.formatMetres(1000), '1000');
});

const cols = (count, width, tablet, fontScale = 1) => A.aircraftColumns({ count, width, tablet, fontScale });
test('phone layout: 1, 4, 5 tiles with max 4 per row', () => {
  assert.deepEqual(A.aircraftRows(1, cols(1, 600, false)), [1]);
  assert.deepEqual(A.aircraftRows(4, cols(4, 600, false)), [4]);
  assert.deepEqual(A.aircraftRows(5, cols(5, 800, false)), [4, 1]);
});
test('tablet layout: 1, 6, 7 tiles with max 6 per row', () => {
  assert.deepEqual(A.aircraftRows(1, cols(1, 1000, true)), [1]);
  assert.deepEqual(A.aircraftRows(6, cols(6, 1000, true)), [6]);
  assert.deepEqual(A.aircraftRows(7, cols(7, 1400, true)), [6, 1]);
});
test('narrow width and XL text reduce columns, never below 1', () => {
  assert.equal(cols(4, 347, false), 2);
  assert.equal(cols(4, 347, false, 1.3), 1);
  assert.equal(cols(6, 700, true, 1.3), 3);
  assert.equal(cols(3, 0, false), 1);
  assert.equal(cols(0, 500, false), 0);
  assert.deepEqual(A.aircraftRows(5, 2), [2, 2, 1]);
});
