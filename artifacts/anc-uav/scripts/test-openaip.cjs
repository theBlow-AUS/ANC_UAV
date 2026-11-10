const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, f);
const data = require('../lib/openaip-data.ts');
const client = require('../lib/openaip-client.ts');
const { createOpenAipRepository } = require('../lib/openaip-store.ts');
const { parseNavigationPack } = require('../data/navigation-pack.ts');
const { lookupFrequencies } = require('../lib/navigation.ts');

const aid = 'a'.repeat(24), sid = 'b'.repeat(24);
const square = [[150, -35], [151, -35], [151, -34], [150, -34], [150, -35]];
function apt() {
  return { _id: aid, country: 'AU', name: 'Synthetic test aerodrome', icaoCode: 'TEST', type: 9,
    geometry: { type: 'Point', coordinates: [150.5, -34.5] },
    frequencies: [{ value: '123.450', unit: 2, type: 4, name: 'CTAF' }] };
}
function asp() {
  return { _id: sid, country: 'AU', name: 'Synthetic test area', type: 26, icaoClass: 2,
    geometry: { type: 'Polygon', coordinates: [structuredClone(square)] },
    lowerLimit: { value: 0, unit: 1, referenceDatum: 0 }, upperLimit: { value: 120, unit: 6, referenceDatum: 2 },
    onDemand: false, onRequest: false, byNotam: false, specialAgreement: false, requestCompliance: false,
    hoursOfOperation: { operatingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek, startTime: '00:00', endTime: '00:00', byNotam: false, sunrise: false, sunset: false, publicHolidaysExcluded: false,
    })) }, frequencies: [{ value: '124.500', unit: 2, name: 'Source-linked area frequency' }] };
}
function sources() {
  return ['au_apt.json', 'au_asp.json'].map((key, i) => ({
    key, bytes: Buffer.byteLength(JSON.stringify([i ? asp() : apt()])), etag: `"test-${i}"`, modifiedAt: '2026-11-10T01:00:00.000Z',
  }));
}
const snapshot = () => data.buildOpenAipSnapshot([apt()], [asp()], sources(), '2026-11-10T06:00:00.000Z');
function listing(files = sources(), truncated = false) {
  return `<ListBucketResult><IsTruncated>${truncated}</IsTruncated>${files.map(f =>
    `<Contents><Key>${f.key}</Key><Size>${f.bytes}</Size><ETag>${f.etag.replaceAll('"', '&quot;')}</ETag><LastModified>${f.modifiedAt}</LastModified></Contents>`).join('')}</ListBucketResult>`;
}
const response = (text, options = {}) => new Response(text, { status: 200, ...options });
const signal = () => new AbortController().signal;
function memoryDisk() {
  const pointers = new Map(), files = new Map();
  const disk = {
    failWrite: false, failPointer: false, shortWrite: false, afterWrite: null,
    async getPointer(n) { return pointers.get(n) ?? null; },
    async setPointer(n, v) { if (disk.failPointer) throw new Error('Disk full'); if (v === null) pointers.delete(n); else pointers.set(n, v); },
    async read(n) { return files.get(n) ?? null; },
    async write(n, v) { if (disk.failWrite) throw new Error('Disk full'); files.set(n, disk.shortWrite ? '{broken' : v); disk.afterWrite?.(); },
    async remove(n) { files.delete(n); }, async list() { return [...files.keys()]; },
  };
  return { disk, pointers, files };
}
const repo = disk => createOpenAipRepository(disk, 'snapshot', data.parseOpenAipSnapshot, 1024 * 1024);

test('complete source snapshot preserves geometry without frequencies and carries sharing licence', () => {
  const area = asp(); area.frequencies = [];
  const s = data.buildOpenAipSnapshot([apt()], [area], sources(), new Date().toISOString());
  assert.equal(s.airspaces.length, 1); assert.equal(s.airspaces[0].frequencies.length, 0);
  assert.equal(s.attribution, data.OPENAIP_NOTICE); assert.equal(s.licence, 'CC BY-NC 4.0');
  assert.equal(s.airports[0].kind, 'airport'); assert.equal(s.airports[0].sourceType, 9);
});
test('source contracts reject empty, duplicate, foreign-country and invalid-coordinate records', () => {
  assert.throws(() => data.buildOpenAipSnapshot([], [asp()], sources(), new Date().toISOString()));
  assert.throws(() => data.buildOpenAipSnapshot([apt(), apt()], [asp()], sources(), new Date().toISOString()));
  assert.throws(() => data.normalizeOpenAipRecord({ ...apt(), country: 'US' }, 'airport'));
  const a = apt(); a.geometry.coordinates[1] = 100;
  assert.throws(() => data.normalizeOpenAipRecord(a, 'airport'));
  assert.throws(() => data.normalizeOpenAipRecord({ ...asp(), geometry: { type: 'Circle' } }, 'airspace'));
});
test('holes and MultiPolygons retain their geometry; local polygon inspection excludes holes', () => {
  const a = asp(); a.geometry.coordinates.push([[150.2, -34.8], [150.8, -34.8], [150.8, -34.2], [150.2, -34.2], [150.2, -34.8]]);
  const r = data.normalizeOpenAipRecord(a, 'airspace');
  assert.equal(data.airspaceContains(r, { longitude: 150.5, latitude: -34.5 }), false);
  assert.equal(data.airspaceContains(r, { longitude: 150.1, latitude: -34.5 }), true);
  a.geometry = { type: 'MultiPolygon', coordinates: [[square]] };
  assert.equal(data.normalizeOpenAipRecord(a, 'airspace').geometry.type, 'MultiPolygon');
});
test('unsupported units remain visible, uncertain conditions are retained, and unknown schedules never become H24', () => {
  const a = asp(); a.lowerLimit.unit = 99; delete a.byNotam; a.hoursOfOperation.extraRestriction = 'unknown';
  const r = data.normalizeOpenAipRecord(a, 'airspace');
  assert.match(data.limitLabel(r.lowerLimit), /unit 99/); assert.equal(r.h24, false);
  assert.ok(r.conditions.some(c => c.includes('unknown: byNotam')));
  assert.match(r.schedule, /extraRestriction/);
});
test('navigation bridge has unknown tower status and only explicit supported area links, never airport radii', () => {
  const s = snapshot(), p = parseNavigationPack(data.openAipNavigationPack(s));
  assert.equal(p.places[0].kind, 'aerodrome-unknown'); assert.equal(p.frequencies.length, 1);
  assert.equal(p.frequencies[0].service, 'AREA_FREQUENCY'); assert.equal(p.frequencies[0].frequencyMHz, '124.500');
  assert.equal(p.provenance.effectiveFrom, null);
  const found = lookupFrequencies([p], { position: { latitude: -34.5, longitude: 150.5 }, altitude: null, altitudeReference: 'AGL', utc: s.retrievedAt });
  assert.equal(found[0].state, 'possible'); assert.ok(found[0].reasons.some(r => r.includes('VALIDITY NOT SUPPLIED')));
  s.airspaces[0].geometry.coordinates.push(square);
  assert.equal(data.openAipNavigationPack(s).frequencies.length, 0);
});
test('snapshot bounds retain offshore Australian territories instead of assuming mainland bounds', () => {
  const s = snapshot(); s.airports[0].position = { longitude: 96.83, latitude: -12.2 };
  assert.ok(data.openAipNavigationPack(s).bounds.west <= 96.83);
});
test('public inventory checks actual required filenames, size limits, and complete listings', () => {
  assert.deepEqual(client.parseOpenAipInventory(listing()), sources());
  assert.throws(() => client.parseOpenAipInventory(listing(sources(), true)), /incomplete/);
  assert.throws(() => client.parseOpenAipInventory(listing([sources()[0]])), /unavailable/);
  assert.throws(() => client.parseOpenAipInventory(listing(sources().map(f => ({ ...f, bytes: 99 * 1024 * 1024 })))), /limit/);
});
test('anonymous full download makes no credential/GPS requests and commits only after rechecking versions', async () => {
  const calls = [], progress = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return url.includes('?') ? response(listing()) : response(JSON.stringify([url.endsWith('apt.json') ? apt() : asp()]));
  };
  const s = await client.downloadOpenAip(fetcher, signal(), p => progress.push(p));
  assert.equal(s.airports.length, 1); assert.equal(s.airspaces.length, 1); assert.equal(calls.length, 4);
  assert.ok(calls.every(c => !c.options.headers && c.options.credentials === 'omit' && c.options.redirect === 'error'));
  assert.ok(calls.every(c => !/latitude|longitude|apiKey/.test(c.url)));
  assert.ok(progress.some(p => p.phase.includes('Validating')));
});
test('export rotation and byte mismatch reject updates without skipping records', async () => {
  let lists = 0;
  const fetcher = async url => {
    if (url.includes('?')) return response(listing(++lists === 1 ? sources() : sources().map(f => ({ ...f, etag: '"changed"' }))));
    return response(JSON.stringify([url.endsWith('apt.json') ? apt() : asp()]));
  };
  await assert.rejects(client.downloadOpenAip(fetcher, signal(), () => {}), /versions changed/);
  await assert.rejects(client.downloadOpenAip(async url => url.includes('?') ? response(listing()) : response('[]'), signal(), () => {}), /changed during/);
});
test('bounded streaming rejects both declared and actual oversized responses', async () => {
  await assert.rejects(client.boundedOpenAipText(async () => response('x', { headers: { 'content-length': '99' } }), 'https://example.test', 3, signal()), /limit/);
  await assert.rejects(client.boundedOpenAipText(async () => response('abcdef'), 'https://example.test', 3, signal()), /limit/);
});
test('401/403/404/429 are distinct; provider errors and thrown secrets are redacted', async () => {
  const codes = { 401: 'auth', 403: 'permission', 404: 'not-found', 429: 'rate' };
  for (const [status, code] of Object.entries(codes)) {
    await assert.rejects(client.boundedOpenAipText(async () => response('SYNTHETIC-DO-NOT-ECHO', { status: Number(status), headers: { 'retry-after': '120' } }), 'https://example.test', 100, signal()),
      e => e.code === code && !e.message.includes('SYNTHETIC') && (code !== 'rate' || e.retryAt > Date.now()));
  }
  await assert.rejects(client.boundedOpenAipText(async () => { throw new Error('SYNTHETIC-DO-NOT-ECHO'); }, 'https://example.test', 100, signal()),
    e => e.code === 'network' && !e.message.includes('SYNTHETIC'));
});
test('cancel before fetching makes no request; redirect responses are rejected', async () => {
  let calls = 0; const ac = new AbortController(); ac.abort();
  await assert.rejects(client.getOpenAipInventory(async () => { calls++; }, ac.signal), e => e.code === 'cancelled');
  assert.equal(calls, 0);
  const r = response('[]'); Object.defineProperty(r, 'url', { value: 'https://untrusted.test/' });
  await assert.rejects(client.boundedOpenAipText(async () => r, 'https://example.test', 100, signal()), /redirect/);
});
test('authenticated detail uses a fixed ID-only host/path and header, retaining separate source dates', async () => {
  let request;
  const d = await client.getOpenAipDetail(async (url, options) => { request = { url, options }; return response(JSON.stringify({ ...apt(), name: 'Refreshed fixture' })); },
    { kind: 'airport', id: aid }, 'synthetic-test-key-not-usable', signal());
  assert.equal(request.url, `https://api.core.openaip.net/api/airports/${aid}`);
  assert.equal(request.options.headers['x-openaip-api-key'], 'synthetic-test-key-not-usable');
  assert.ok(!request.url.includes('synthetic')); assert.equal(d.record.name, 'Refreshed fixture');
  assert.equal(snapshot().airports[0].name, 'Synthetic test aerodrome');
  await assert.rejects(client.getOpenAipDetail(async () => { throw new Error('Must not fetch'); },
    { kind: 'airport', id: 'https://untrusted.test' }, 'synthetic-test-key-not-usable', signal()), /Invalid/);
});
test('API ID mismatch or malformed response cannot enter the detail cache', async () => {
  await assert.rejects(client.getOpenAipDetail(async () => response(JSON.stringify({ ...apt(), _id: sid })),
    { kind: 'airport', id: aid }, 'synthetic-test-key-not-usable', signal()), /Unsupported/);
});
test('snapshot save and offline relaunch use a file pointer, preserving one previous generation', async () => {
  const { disk, files } = memoryDisk(), r = repo(disk);
  const a = snapshot(); await r.save(a); const b = snapshot(); b.retrievedAt = '2026-11-10T07:00:00.000Z'; await r.save(b);
  assert.equal((await repo(disk).load()).value.retrievedAt, b.retrievedAt); assert.equal(files.size, 2);
  assert.equal((await r.load()).bytes, [...files.values()].reduce((n, v) => n + Buffer.byteLength(v), 0));
  await r.save(a); assert.equal(files.size, 2);
});
for (const failure of ['failWrite', 'failPointer', 'shortWrite']) test(`${failure}: incomplete update preserves the prior committed snapshot`, async () => {
  const { disk, files } = memoryDisk(), r = repo(disk); const a = snapshot(); await r.save(a);
  disk[failure] = true;
  await assert.rejects(r.save({ ...a, retrievedAt: '2026-11-10T08:00:00.000Z' }));
  disk[failure] = false;
  assert.equal((await repo(disk).load()).value.retrievedAt, a.retrievedAt); assert.equal(files.size, 1);
});
test('cancellation during staging does not publish the pointer', async () => {
  const { disk } = memoryDisk(), r = repo(disk); await r.save(snapshot());
  const ac = new AbortController(); disk.afterWrite = () => ac.abort();
  await assert.rejects(r.save({ ...snapshot(), retrievedAt: '2026-11-10T08:00:00.000Z' }, ac.signal), e => e.code === 'cancelled');
  assert.equal((await repo(disk).load()).value.retrievedAt, snapshot().retrievedAt);
});
test('corrupt current recovers the previous snapshot; both corrupt preserves files and requires reset', async () => {
  const { disk, files, pointers } = memoryDisk(), r = repo(disk); await r.save(snapshot()); await r.save(snapshot());
  const i = JSON.parse(pointers.get('snapshot')); files.set(i.current, '{broken');
  const recovered = await repo(disk).load(); assert.equal(recovered.recovered, true);
  files.set(i.previous, '{broken');
  const rr = repo(disk); await assert.rejects(rr.load(), /preserved/); assert.equal(files.size, 2);
  await assert.rejects(rr.save(snapshot()), /reset/); assert.equal(files.size, 2);
  await rr.clear(); assert.equal(files.size, 0); assert.equal(pointers.size, 0);
});
test('oversized cache and invalid pointers cannot silently overwrite existing data', async () => {
  const { disk, pointers } = memoryDisk();
  const small = createOpenAipRepository(disk, 'snapshot', v => v, 20);
  await assert.rejects(small.save({ data: 'x'.repeat(40) }), /limit/);
  pointers.set('snapshot', JSON.stringify({ current: '../other-provider', previous: null }));
  await assert.rejects(repo(disk).load(), /preserved/);
});
test('source removal includes abandoned stages but not other namespaces or personal-key markers', async () => {
  const { disk, pointers, files } = memoryDisk(), r = repo(disk); await r.save(snapshot());
  pointers.set('personal-key-marker', 'yes'); files.set('snapshot-abandoned.json', '{}'); files.set('details-retained.json', '[]');
  await r.clear(); assert.deepEqual([...files.keys()], ['details-retained.json']); assert.equal(pointers.get('personal-key-marker'), 'yes');
});
function deviceHarness({ platform = 'ios', expoGo = false, enrolled = true } = {}) {
  const secure = new Map(), ordinary = new Map(), calls = [];
  const store = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    isAvailableAsync: async () => true, canUseBiometricAuthentication: () => enrolled,
    async setItemAsync(k, v, opts) { calls.push(['set', k, opts]); secure.set(k, v); },
    async getItemAsync(k, opts) { calls.push(['get', k, opts]); return secure.get(k) ?? null; },
    async deleteItemAsync(k, opts) { calls.push(['delete', k, opts]); secure.delete(k); },
  };
  const prefs = { getItem: async k => ordinary.get(k) ?? null, setItem: async (k, v) => ordinary.set(k, v), removeItem: async k => ordinary.delete(k) };
  const mocks = { 'react-native': { Platform: { OS: platform }, Share: { share: async () => {} } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: expoGo ? 'store' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'store' } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: prefs }, 'expo-file-system/legacy': {}, 'expo-secure-store': store };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/openaip-device.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', output)(n => mocks[n], mod, mod.exports);
  return { api: mod.exports, secure, ordinary, calls, store, prefs };
}
test('personal key is protected, replaced and removed in its own namespace; status checks never decrypt', async () => {
  const h = deviceHarness(); h.secure.set('anc-uav.account.v1.naips', 'unrelated-test-entry');
  await h.api.saveOpenAipKey('synthetic-test-key-not-usable');
  assert.equal(await h.api.openAipKeyStatus(), 'saved'); assert.equal(h.calls.filter(c => c[0] === 'get').length, 0);
  assert.ok([...h.ordinary.values()].every(v => !v.includes('synthetic')));
  assert.equal(await h.api.readOpenAipKey(), 'synthetic-test-key-not-usable');
  await h.api.saveOpenAipKey('replacement-synthetic-test-key');
  assert.equal(await h.api.readOpenAipKey(), 'replacement-synthetic-test-key');
  assert.ok(h.calls.every(c => c[2].requireAuthentication && c[2].keychainAccessible === 'device-only'));
  await h.api.removeOpenAipKey(); assert.equal(await h.api.openAipKeyStatus(), 'none');
  assert.equal(h.secure.get('anc-uav.account.v1.naips'), 'unrelated-test-entry');
});
for (const options of [{ platform: 'web' }, { expoGo: true }, { enrolled: false }]) test(`unsupported protected-key environment fails closed: ${JSON.stringify(options)}`, async () => {
  const h = deviceHarness(options);
  assert.equal(await h.api.openAipKeyStatus(), 'unavailable');
  await assert.rejects(h.api.saveOpenAipKey('synthetic-test-key-not-usable'), /native build/);
  assert.equal(h.secure.size, 0); assert.equal(h.calls.length, 0);
});
test('key removal still works after authentication enrolment changes', async () => {
  const h = deviceHarness({ enrolled: false }); h.secure.set('anc-uav.openaip.personal-key.v1', 'synthetic-test-key-not-usable');
  await h.api.removeOpenAipKey(); assert.equal(h.secure.size, 0);
});
test('key persistence/authentication failures are redacted and do not use ordinary-preference fallbacks', async () => {
  const h = deviceHarness(); h.store.setItemAsync = async () => { throw new Error('SYNTHETIC-DO-NOT-ECHO'); };
  await assert.rejects(h.api.saveOpenAipKey('synthetic-test-key-not-usable'), e => !e.message.includes('SYNTHETIC') && /not saved/.test(e.message));
  assert.equal(h.ordinary.size, 0);
  h.store.getItemAsync = async () => { throw new Error('SYNTHETIC-DO-NOT-ECHO'); };
  await assert.rejects(h.api.readOpenAipKey(), e => !e.message.includes('SYNTHETIC') && /unlocked/.test(e.message));
  assert.throws(() => h.api.validateOpenAipKey('header\r\ninjection'), /without spaces/);
});
test('non-secret marker failure is explicit and never loses the already protected key', async () => {
  const h = deviceHarness(); h.prefs.setItem = async () => { throw new Error('Preferences unavailable'); };
  await assert.rejects(h.api.saveOpenAipKey('synthetic-test-key-not-usable'), /may be saved/);
  assert.equal(h.secure.size, 1); assert.equal(h.ordinary.size, 0);
});
test('app wiring never imports the disabled vault or an environment/shared-key source', () => {
  const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  for (const f of ['lib/openaip-device.ts', 'lib/openaip-client.ts', 'context/OpenAipContext.tsx']) {
    assert.doesNotMatch(read(f), /process\.env|EXPO_PUBLIC|secure-vault|saveProviderCredential|console\.log/);
  }
  assert.match(read('app/_layout.tsx'), /<OpenAipProvider>[\s\S]*<NavigationProvider>/);
  assert.match(read('app/(tabs)/map.tsx'), /<OpenAipManager/);
  assert.match(read('components/OpenAipManager.tsx'), /secureTextEntry/);
  assert.match(read('components/OpenAipManager.tsx'), /s !== 'active'.*setDraft\(''\)/);
  assert.match(read('context/NavigationContext.tsx'), /downloadedOpenAip \? \[REFERENCE, downloadedOpenAip\]/);
});

// Small hook/JSX harness: real provider, clients and repository; only native
// runtime and HTTP are doubled. This is not a native-binary security test.
function providerHarness(disk, state) {
  let cursor = 0, mounted = false;
  const slots = [], effects = [];
  const useState = initial => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
  };
  class KeyError extends Error {}
  const fetcher = async (url, options) => {
    state.requests.push({ url, options });
    if (url.includes('api.core.openaip.net')) return response(JSON.stringify({ ...apt(), name: 'API refreshed fixture' }));
    return url.includes('?') ? response(listing()) : response(JSON.stringify([url.endsWith('apt.json') ? apt() : asp()]));
  };
  const mocks = {
    react: {
      useState, useRef: initial => useState(() => ({ current: initial }))[0],
      useEffect: fn => { if (!mounted) effects.push(fn); }, createContext: () => ({ Provider: 'Provider' }),
    },
    'expo/fetch': { fetch: fetcher },
    '../lib/openaip-data': data, '../lib/openaip-client': client, '../lib/openaip-store': { createOpenAipRepository },
    '../lib/openaip-device': {
      canDownloadOpenAip: true, openAipDisk: disk, OpenAipKeyError: KeyError,
      openAipKeyStatus: async () => state.key ? 'saved' : 'none',
      saveOpenAipKey: async key => { state.key = key; }, removeOpenAipKey: async () => { state.key = null; },
      readOpenAipKey: async () => { if (!state.key) throw new KeyError('No test key'); return state.key; },
    },
  };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../context/OpenAipContext.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', output)(n => mocks[n] ?? require(n), mod, mod.exports);
  return {
    render() {
      cursor = 0;
      const node = mod.exports.OpenAipProvider({ children: null });
      if (!mounted) { mounted = true; effects.forEach(fn => fn()); }
      return node.props.value;
    },
  };
}
test('provider flow downloads, saves personal key without requests, caches detail and survives offline remount', async () => {
  const { disk, pointers } = memoryDisk(), state = { key: null, requests: [] };
  const h = providerHarness(disk, state); h.render();
  await new Promise(r => setImmediate(r));
  let o = h.render(); assert.equal(o.ready, true); assert.equal(state.requests.length, 0);
  await o.download(); o = h.render(); assert.equal(o.snapshot.airspaces.length, 1);
  assert.equal(state.requests.length, 4);
  o.selectRecord({ kind: 'airport', id: aid }); o = h.render();
  await o.saveKey('synthetic-test-key-not-usable'); o = h.render();
  assert.equal(o.keyStatus, 'saved'); assert.equal(state.requests.length, 4);
  await o.refreshSelected(); o = h.render();
  assert.equal(o.detail.record.name, 'API refreshed fixture'); assert.equal(o.selected.name, apt().name);
  assert.equal(state.requests.length, 5); assert.ok(pointers.has('details'));
  await o.removeKey(); o = h.render();
  assert.equal(o.keyStatus, 'none'); assert.ok(o.snapshot); assert.ok(o.detail);
  await o.refreshSelected(); o = h.render(); assert.equal(state.requests.length, 5); assert.match(o.error, /No test key/);
  const reloaded = providerHarness(disk, state); reloaded.render(); await new Promise(r => setImmediate(r));
  o = reloaded.render(); assert.equal(o.snapshot.airports.length, 1); assert.equal(state.requests.length, 5);
  o.selectRecord({ kind: 'airport', id: aid }); o = reloaded.render(); assert.equal(o.detail.record.name, 'API refreshed fixture');
  await o.saveKey('replacement-synthetic-test-key'); o = reloaded.render();
  await o.removeDownloads(); o = reloaded.render();
  assert.equal(o.snapshot, null); assert.equal(o.detail, null); assert.equal(state.key, 'replacement-synthetic-test-key');
  assert.equal(pointers.size, 0);
});

function uiHarness(o) {
  let cursor = 0, background;
  const slots = [];
  const useState = initial => {
    const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
  };
  const mocks = {
    react: { useState, useMemo: fn => fn(), useEffect: fn => fn() },
    '@expo/vector-icons': { Feather: 'Feather' },
    'react-native': {
      Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', Switch: 'Switch',
      Platform: { OS: 'ios' }, StyleSheet: { create: x => x },
      AppState: { addEventListener: (_, fn) => { background = fn; return { remove() {} }; } },
      Alert: { alert() {} }, Linking: { openURL: async () => {} },
    },
    '../context/OpenAipContext': { useOpenAip: () => o },
    '../hooks/useColors': { useColors: () => ({}) }, '../hooks/useUi': { useUi: () => ({ fs: n => n, side: false }) },
    '../lib/openaip-data': data, './Accordion': { Accordion: 'Accordion' },
    './FieldKit': Object.fromEntries(['ActionButton', 'Badge', 'Callout', 'Divider', 'DISPLAY'].map(s => [s, s])),
  };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/OpenAipManager.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', output)(n => mocks[n] ?? require(n), mod, mod.exports);
  return { render(fn = mod.exports.OpenAipManager) { cursor = 0; return fn(); }, background: value => background(value) };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
test('native management buttons bind real actions, cancellation only appears for cancellable work', () => {
  let downloads = 0, checks = 0, cancelled = 0;
  const o = { snapshot: null, ready: true, canDownload: true, keyStatus: 'none', hits: [], progress: null,
    checkUpdates: () => checks++, download: () => downloads++, cancel: () => cancelled++ };
  const h = uiHarness(o);
  let tree = h.render(), field = id => nodes(tree).find(n => n.props?.testID === id);
  field('openaip-check').props.onPress(); field('openaip-download').props.onPress();
  assert.equal(checks, 1); assert.equal(downloads, 1); assert.equal(field('openaip-cancel'), undefined);
  o.busy = true; o.cancellable = true; tree = h.render();
  assert.equal(field('openaip-download').props.disabled, true);
  field('openaip-cancel').props.onPress(); assert.equal(cancelled, 1);
  o.cancellable = false; tree = h.render(); assert.equal(field('openaip-cancel'), undefined);
});
test('masked key draft clears on save/background and unknown status supports replacement/removal', () => {
  let saved;
  const o = { snapshot: null, ready: true, canDownload: true, keyStatus: 'unknown', hits: [],
    saveKey: v => { saved = v; } };
  const h = uiHarness(o), root = h.render();
  const Key = nodes(root).find(n => typeof n.type === 'function' && n.type.name === 'KeySection').type;
  let tree = h.render(Key), field = id => nodes(tree).find(n => n.props?.testID === id);
  assert.equal(field('openaip-key-input').props.secureTextEntry, true);
  assert.equal(field('openaip-key-input').props.autoComplete, 'off');
  field('openaip-key-input').props.onChangeText('synthetic-test-key-not-usable'); tree = h.render(Key);
  field('openaip-save-key').props.onPress(); tree = h.render(Key);
  assert.equal(saved, 'synthetic-test-key-not-usable'); assert.equal(field('openaip-key-input').props.value, '');
  field('openaip-key-input').props.onChangeText('replacement-synthetic-test-key');
  h.background('background'); tree = h.render(Key); assert.equal(field('openaip-key-input').props.value, '');
  o.keyStatus = 'unavailable'; tree = h.render(Key);
  assert.equal(field('openaip-key-input'), undefined); assert.ok(field('openaip-remove-key'));
});
