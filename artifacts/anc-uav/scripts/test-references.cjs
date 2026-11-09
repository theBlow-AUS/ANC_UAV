// Synthetic local fixtures only. No provider credentials, network or aviation data.
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { PROVIDER_ACCESS, assertProviderDownloadAllowed } = require('../data/provider-access.ts');
const { parseSnapshotManifest, snapshotStatus, validateSnapshotBytes } = require('../data/reference-snapshot.ts');

const files = new Map(), dirs = new Set(), picks = [];
let platform = 'ios', failMove = false, secureReads = 0, secureWrites = 0;
const fakeFs = {
  documentDirectory: 'file:///documents/', EncodingType: { Base64: 'base64' },
  async getInfoAsync(uri) { return files.has(uri) ? { exists: true, isDirectory: false, size: files.get(uri).length } : { exists: false }; },
  async makeDirectoryAsync(uri) { dirs.add(uri); },
  async copyAsync({ from, to }) { if (!files.has(from)) throw new Error('Missing file'); files.set(to, files.get(from)); },
  async writeAsStringAsync(uri, data) { files.set(uri, Buffer.from(data)); },
  async readAsStringAsync(uri, options) {
    if (!files.has(uri)) throw new Error('Missing file');
    const data = files.get(uri);
    return options?.encoding === 'base64' ? data.subarray(options.position, options.position + options.length).toString('base64') : data.toString('utf8');
  },
  async moveAsync({ from, to }) {
    if (failMove) throw new Error('Synthetic storage failure');
    for (const [key, data] of [...files]) if (key.startsWith(from)) { files.set(to + key.slice(from.length), data); files.delete(key); }
    dirs.delete(from); dirs.add(to);
  },
  async deleteAsync(uri) {
    files.delete(uri);
    for (const key of [...files.keys()]) if (key.startsWith(uri)) files.delete(key);
    for (const key of [...dirs]) if (key.startsWith(uri)) dirs.delete(key);
  },
  async readDirectoryAsync(uri) { return [...dirs].filter(d => d.startsWith(uri) && d !== uri).map(d => d.slice(uri.length).replace(/\/$/, '')).filter(d => !d.includes('/')); },
};
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'expo-file-system/legacy') return fakeFs;
  if (name === 'expo-document-picker') return { getDocumentAsync: async () => picks.shift() ?? { canceled: true } };
  if (name === 'react-native') return { Platform: { get OS() { return platform; } } };
  if (name === 'expo-secure-store') return {
    isAvailableAsync: async () => true, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    async getItemAsync() { secureReads++; return JSON.stringify({ accountName: 'synthetic', secret: 'test-only' }); },
    async setItemAsync() { secureWrites++; }, async deleteItemAsync() {},
  };
  return originalLoad.call(this, name, ...args);
};
const storage = require('../lib/reference-storage.ts');
const vault = require('../lib/secure-vault.ts');
Module._load = originalLoad;
const manifest = (provider = 'naips') => ({
  schemaVersion: 1, provider, referenceId: 'synthetic-test', title: 'SYNTHETIC — NOT FOR OPERATIONAL USE',
  sourceUrl: PROVIDER_ACCESS.find(p => p.id === provider).url,
  sourceIssuedAt: '2026-11-09T00:00:00Z', effectiveFrom: '2026-11-09T00:00:00Z', effectiveTo: '2026-11-10T00:00:00Z',
  rightsReference: 'Synthetic test only; no rights asserted', authorizedUseScope: 'Engineering tests only', format: provider === 'weathercams' ? 'png' : provider === 'airservices' ? 'pdf' : 'text',
});
function reset() { files.clear(); dirs.clear(); picks.length = 0; platform = 'ios'; failMove = false; }
function pick(uri, content) {
  files.set(uri, Buffer.isBuffer(content) ? content : Buffer.from(content));
  picks.push({ canceled: false, assets: [{ uri }] });
}
function pickPair(m = manifest(), payload = 'SYNTHETIC TEST ONLY') {
  pick('file:///cache/manifest.json', JSON.stringify(m));
  pick('file:///cache/payload', payload);
}

test('all providers are gated before any credential/network operation; no approval override', () => {
  for (const p of PROVIDER_ACCESS) assert.throws(() => assertProviderDownloadAllowed(p.id), /blocked/);
  assert.throws(() => parseSnapshotManifest({ ...manifest(), approved: true }), /Unsupported manifest fields/);
  assert.throws(() => parseSnapshotManifest({ ...manifest(), credential: 'never-accepted' }));
});
test('manifest validates provider-specific formats and strips no approval into trust', () => {
  for (const p of PROVIDER_ACCESS) assert.equal(parseSnapshotManifest(manifest(p.id)).provider, p.id);
  assert.throws(() => parseSnapshotManifest(manifest(), 'airservices'), /different provider/);
  for (const p of PROVIDER_ACCESS) {
    assert.throws(() => parseSnapshotManifest({ ...manifest(p.id), format: 'html' }));
    for (const key of ['rightsReference', 'authorizedUseScope']) assert.throws(() => parseSnapshotManifest({ ...manifest(p.id), [key]: '' }));
  }
});
test('URLs cannot smuggle remote endpoints, credentials, queries or local paths', () => {
  for (const sourceUrl of [
    'http://www.airservicesaustralia.com/naips/', 'https://evil.test/naips/',
    'https://www.airservicesaustralia.com.evil.test/naips/', 'https://user:secret@www.airservicesaustralia.com/naips/',
    'https://www.airservicesaustralia.com/naips/?token=x', 'https://www.airservicesaustralia.com/naips/#token',
    'file:///private/file', 'https://www.airservicesaustralia.com/aip/',
  ]) assert.throws(() => parseSnapshotManifest({ ...manifest(), sourceUrl }));
  assert.throws(() => parseSnapshotManifest({ ...manifest(), referenceId: '../vault' }));
});
test('dates reject impossible, ambiguous and inverted ranges', () => {
  for (const sourceIssuedAt of ['2026-02-30T00:00:00Z', '2026-11-09', '2026-11-09T00:00:00', '2026-11-09T25:00:00Z', undefined])
    assert.throws(() => parseSnapshotManifest({ ...manifest(), sourceIssuedAt }));
  assert.throws(() => parseSnapshotManifest({ ...manifest(), effectiveTo: manifest().effectiveFrom }));
});
test('offline stale, missing, future and end-exclusive dates never become verified current', () => {
  const m = parseSnapshotManifest(manifest());
  assert.match(snapshotStatus(m, Date.parse(m.effectiveTo)), /STALE/);
  assert.match(snapshotStatus({ ...m, sourceIssuedAt: null }, Date.parse(m.effectiveFrom)), /UNKNOWN/);
  assert.match(snapshotStatus({ ...m, effectiveTo: null }, Date.parse(m.effectiveFrom)), /UNKNOWN/);
  assert.match(snapshotStatus(m, Date.parse('2026-11-08T00:00:00Z')), /FUTURE/);
  assert.match(snapshotStatus({ ...m, sourceIssuedAt: null }, Date.parse('2026-11-08T00:00:00Z')), /NOT YET/);
  assert.match(snapshotStatus(m, Date.parse(m.effectiveFrom)), /NOT VERIFIED/);
  for (const now of [0, Date.parse(m.effectiveFrom), Date.parse(m.effectiveTo)])
    assert.match(snapshotStatus(manifest('weathercams'), now), /HISTORICAL IMAGE — NOT CURRENT WEATHER/);
});
test('payload structural validation rejects login HTML and truncated binary files', () => {
  const bytes = s => [...Buffer.from(s)];
  assert.doesNotThrow(() => validateSnapshotBytes('text', [], [], 'SYNTHETIC ONLY'));
  for (const text of ['<html>Login failed</html>', '', 'x'.repeat(180001), '\u0000'])
    assert.throws(() => validateSnapshotBytes('text', [], [], text));
  assert.doesNotThrow(() => validateSnapshotBytes('pdf', bytes('%PDF-1.7'), bytes('%%EOF')));
  assert.throws(() => validateSnapshotBytes('pdf', bytes('<html>'), bytes('%%EOF')));
  assert.throws(() => validateSnapshotBytes('pdf', bytes('%PDF-1.7'), []));
  assert.doesNotThrow(() => validateSnapshotBytes('jpeg', [255,216,255], [255,217]));
  assert.throws(() => validateSnapshotBytes('jpeg', [255,216,255], []));
  const png = [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82];
  const end = [0,0,0,0,73,69,78,68,174,66,96,130];
  assert.doesNotThrow(() => validateSnapshotBytes('png', png, end));
  assert.throws(() => validateSnapshotBytes('png', png, []));
});
test('native import persists an unverified local snapshot and reloads independently', async () => {
  reset(); pickPair();
  const snapshot = await storage.importReferenceSnapshot('naips');
  assert.equal(snapshot.contentState, 'user-imported-unverified');
  assert.match(storage.snapshotFileUri(snapshot), /^file:\/\/\/documents\//);
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [snapshot]);
  assert.equal(await storage.readReferenceText(snapshot), 'SYNTHETIC TEST ONLY');
  assert.ok(!files.has('file:///cache/manifest.json'));
  assert.ok(!files.has('file:///cache/payload'));
});
test('cancel at either picker leaves previous snapshot intact', async () => {
  reset(); pickPair();
  const old = await storage.importReferenceSnapshot('naips');
  assert.equal(await storage.importReferenceSnapshot('naips', old), null);
  pick('file:///cache/manifest.json', JSON.stringify(manifest()));
  picks.push({ canceled: true });
  assert.equal(await storage.importReferenceSnapshot('naips', old), null);
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
});
test('invalid/oversized payload and wrong-provider updates cannot replace a saved file', async () => {
  reset(); pickPair();
  const old = await storage.importReferenceSnapshot('naips');
  for (const payload of ['<html>Login</html>', Buffer.alloc(10 * 1024 * 1024 + 1, 65)]) {
    pickPair(manifest(), payload);
    await assert.rejects(storage.importReferenceSnapshot('naips', old));
    assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
  }
  pick('file:///cache/manifest.json', JSON.stringify(manifest('airservices')));
  await assert.rejects(storage.importReferenceSnapshot('naips', old), /different provider/);
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
});
test('failed disk commit preserves the prior snapshot and cleans staging', async () => {
  reset(); pickPair();
  const old = await storage.importReferenceSnapshot('naips');
  pickPair(); failMove = true;
  await assert.rejects(storage.importReferenceSnapshot('naips', old), /storage failure/);
  failMove = false;
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
  assert.ok(![...dirs].some(d => d.includes('.pending-')));
});
test('updates retain earlier versions and deletion removes only the selected one', async () => {
  reset(); pickPair();
  const old = await storage.importReferenceSnapshot('naips');
  pickPair({ ...manifest(), sourceIssuedAt: '2026-11-09T01:00:00Z' });
  const next = await storage.importReferenceSnapshot('naips', old);
  assert.equal((await storage.listReferenceSnapshots()).snapshots.length, 2);
  await storage.deleteReferenceSnapshot(next);
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
});
test('wrong reference ID and missing/older issued time are rejected on replacement', async () => {
  reset(); pickPair();
  const old = await storage.importReferenceSnapshot('naips');
  for (const changes of [{ referenceId: 'another' }, { sourceIssuedAt: null }, { sourceIssuedAt: '2026-11-08T00:00:00Z' }]) {
    pick('file:///cache/manifest.json', JSON.stringify({ ...manifest(), ...changes }));
    await assert.rejects(storage.importReferenceSnapshot('naips', old));
  }
  assert.deepEqual((await storage.listReferenceSnapshots()).snapshots, [old]);
});
test('reload rejects malformed metadata or missing payload rather than hiding errors', async () => {
  reset(); pickPair();
  const snapshot = await storage.importReferenceSnapshot('naips');
  files.delete(storage.snapshotFileUri(snapshot));
  const result = await storage.listReferenceSnapshots();
  assert.equal(result.snapshots.length, 0);
  assert.equal(result.errors.length, 1);
});
test('browser snapshot operations fail without falling back to web storage', async () => {
  reset(); platform = 'web';
  await assert.rejects(storage.importReferenceSnapshot('naips'), /native app/);
  await assert.rejects(storage.listReferenceSnapshots(), /native app/);
  assert.equal(files.size, 0);
  assert.equal(await vault.isVaultAvailable(), false);
});
test('credential capture is blocked at the library boundary for every provider', async () => {
  reset();
  for (const provider of ['naips', 'airservices', 'casa'])
    await assert.rejects(vault.saveProviderCredential(provider, 'synthetic', 'test-only'), /disabled/);
  assert.equal(secureWrites, 0);
  assert.equal(secureReads, 0);
  await vault.testProviderUnlock('naips');
  assert.equal(secureReads, 1);
  platform = 'web';
  await assert.rejects(vault.testProviderUnlock('naips'), /unavailable/);
  assert.equal(secureReads, 1);
});
