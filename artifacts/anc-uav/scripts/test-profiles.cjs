// Pure model + injected local storage; no network, device services or provider data.
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } };
  if (name === 'react') return { useSyncExternalStore: () => null };
  return originalLoad.call(this, name, ...args);
};
const P = require('../lib/operating-profiles.ts');
const A = require('../lib/aircraft.ts');
const { createProfileStore } = require('../lib/profile-store.ts');
Module._load = originalLoad;
function fake(init = {}) {
  const data = new Map(Object.entries(init));
  const kv = { data, failRead: null, failWrite: false, writes: [],
    async getItem(k) { if (kv.failRead === '*' || kv.failRead === k) throw Error('read'); return data.get(k) ?? null; },
    async setItem(k, value) { await new Promise(r => setTimeout(r, 1)); if (kv.failWrite) throw Error('write'); data.set(k, value); kv.writes.push(k); } };
  return kv;
}
const match = s => P.findVersion(s.get().doc, s.get().doc?.activeVersionId);
const draft = (patch = {}) => ({ ...P.starterDraft(), reoc: 'ReOC A', name: 'Field', label: 'v1', operationType: 'VLOS', ...patch });
async function setup(init) { const kv = fake(init); const s = createProfileStore(kv); await s.ready; return { kv, s }; }
const target = (s, m = match(s)) => ({ profileId: m.profile.id, versionId: m.version.id, expectedRevision: s.get().doc.revision });
async function add(s, patch) { const result = await s.save(draft(patch)); assert.equal(result.ok, true, result.error); return result.versionId; }

test('first installation commits exact defaults and touches only the profile key', async () => {
  const { kv, s } = await setup({ 'anc-uav.ui.v1': 'display-data', 'anc-uav.app-data.v1': 'content-data' });
  assert.equal(s.get().readBlocked, false);
  assert.deepEqual(match(s).version.limits, { maxHeightM: 120, peopleM: 30, verticalFt: 500, horizontalM: 1500 });
  assert.deepEqual(match(s).version.aircraft.map(a => [a.name, a.distanceM]), [['Mini', 500], ['M30T', 1000], ['Matrice 4/5T', 800]]);
  assert.equal(match(s).version.customOperation, 'Reference only');
  assert.deepEqual(kv.writes, [P.PROFILES_KEY]);
  assert.equal(kv.data.get('anc-uav.ui.v1'), 'display-data');
  assert.equal(kv.data.get('anc-uav.app-data.v1'), 'content-data');
});
test('legacy aircraft custom edits, removed defaults, source notes and intentionally empty lists migrate exactly', async () => {
  for (const list of [[{ id: 'custom', name: 'My aircraft', distanceM: 345.5, source: 'OM v4 section 7' }], []]) {
    const legacy = A.serialize(list);
    const { kv, s } = await setup({ [A.AIRCRAFT_KEY]: legacy });
    assert.deepEqual(match(s).version.aircraft, list);
    assert.equal(kv.data.get(A.AIRCRAFT_KEY), legacy);
    const restart = createProfileStore(kv); await restart.ready;
    assert.deepEqual(match(restart).version.aircraft, list);
    assert.deepEqual(kv.writes, [P.PROFILES_KEY]);
  }
});
test('damaged legacy data never gets partially migrated, discarded or replaced by defaults', async () => {
  const aircraft = [{ id: 'a', name: 'X', distanceM: 1, source: '' }];
  for (const raw of ['{bad', JSON.stringify({ version: 2, aircraft }), JSON.stringify({ version: 1, aircraft: [...aircraft, null] }),
    JSON.stringify({ version: 1, aircraft: [...aircraft, ...aircraft] })]) {
    const { kv, s } = await setup({ [A.AIRCRAFT_KEY]: raw });
    assert.equal(s.get().readBlocked, true); assert.equal(s.get().doc, null);
    assert.equal(kv.data.get(A.AIRCRAFT_KEY), raw);
    assert.equal(kv.data.has(P.PROFILES_KEY), false); assert.equal(kv.writes.length, 0);
    assert.equal((await s.save(draft())).ok, false);
  }
});
test('bad saved profiles block every mutation and reload recovers without consulting legacy data', async () => {
  const { kv, s } = await setup({ [P.PROFILES_KEY]: '{bad', [A.AIRCRAFT_KEY]: A.serialize([]) });
  assert.equal(s.get().readBlocked, true);
  for (const op of [() => s.save(draft()), () => s.select(null), () => s.removeVersion('a'), () => s.removeProfile('a'), () => s.reset('a', 0)])
    assert.equal((await op()).ok, false);
  assert.equal(kv.writes.length, 0);
  kv.data.set(P.PROFILES_KEY, JSON.stringify(P.starterDoc()));
  kv.failRead = A.AIRCRAFT_KEY;
  await s.reload();
  assert.equal(s.get().readBlocked, false); assert.equal(match(s).version.aircraft.length, 3);
});
test('profile read, legacy read and migration write failures expose no unsaved starter and keep the legacy key', async () => {
  for (const failure of ['profile-read', 'legacy-read', 'write']) {
    const legacy = A.serialize([]);
    const kv = fake({ [A.AIRCRAFT_KEY]: legacy });
    if (failure === 'write') kv.failWrite = true;
    else kv.failRead = failure === 'profile-read' ? P.PROFILES_KEY : A.AIRCRAFT_KEY;
    const s = createProfileStore(kv); await s.ready;
    assert.equal(s.get().doc, null); assert.equal(s.get().readBlocked, true); assert.ok(s.get().error);
    assert.equal(kv.data.get(A.AIRCRAFT_KEY), legacy);
    assert.equal(kv.data.has(P.PROFILES_KEY), false);
    kv.failRead = null; kv.failWrite = false; await s.reload();
    assert.equal(s.get().readBlocked, false); assert.deepEqual(match(s).version.aircraft, []);
  }
});
test('same profile names under different ReOCs remain independent; explicit complete-set selection survives restart', async () => {
  const { kv, s } = await setup();
  const initial = s.get().doc.activeVersionId;
  const first = await add(s, { maxHeightM: '90', aircraft: [{ id: 'one', name: 'Solo machine', distanceM: 450, source: 'A manual' }] });
  const second = await add(s, { reoc: 'ReOC B', maxHeightM: '80', peopleM: '40', verticalFt: '600', horizontalM: '1700', aircraft: [] });
  assert.equal(s.get().doc.activeVersionId, initial);
  assert.equal((await s.select(first)).ok, true);
  assert.equal(match(s).version.limits.maxHeightM, 90); assert.equal(match(s).version.aircraft[0].name, 'Solo machine');
  assert.equal((await s.select(second)).ok, true);
  const restarted = createProfileStore(kv); await restarted.ready;
  assert.equal(match(restarted).profile.reoc, 'ReOC B');
  assert.deepEqual(match(restarted).version.limits, { maxHeightM: 80, peopleM: 40, verticalFt: 600, horizontalM: 1700 });
  assert.deepEqual(match(restarted).version.aircraft, []);
  assert.equal((await s.save(draft({ reoc: '  reoc   A ', name: ' FIELD ' }))).ok, false);
});
test('versions are independent snapshots; editing and rename preserve the other saved versions', async () => {
  const { s } = await setup();
  const original = match(s); const originalCopy = P.clone(original.version);
  const next = P.toDraft(original.profile, original.version);
  next.label = 'v2'; next.operationType = 'EVLOS'; next.maxHeightM = '100'; next.aircraft[0].distanceM = 600;
  const created = await s.save(next, { profileId: original.profile.id, expectedRevision: s.get().doc.revision });
  assert.equal(created.ok, true, created.error);
  assert.deepEqual(P.findVersion(s.get().doc, original.version.id).version, originalCopy);
  assert.equal(s.get().doc.activeVersionId, original.version.id);
  let second = P.findVersion(s.get().doc, created.versionId);
  const edited = P.toDraft(second.profile, second.version);
  edited.reoc = 'ReOC renamed'; edited.name = 'Renamed profile'; edited.horizontalM = '1600';
  assert.equal((await s.save(edited, target(s, second))).ok, true);
  assert.equal(P.findVersion(s.get().doc, original.version.id).profile.name, 'Renamed profile');
  assert.deepEqual(P.findVersion(s.get().doc, original.version.id).version, originalCopy);
  second = P.findVersion(s.get().doc, created.versionId);
  const collision = P.toDraft(second.profile, second.version); collision.label = '1';
  assert.equal((await s.save(collision, target(s, second))).ok, false);
});
test('duplicate profile copies are isolated and draft cancellation requires no write', async () => {
  const { kv, s } = await setup();
  const original = P.clone(match(s));
  const copy = P.toDraft(original.profile, original.version);
  copy.name = 'Copy'; copy.aircraft[0].name = 'Copy Mini';
  const writes = kv.writes.length;
  assert.deepEqual(match(s), original); assert.equal(kv.writes.length, writes);
  const result = await s.save(copy); assert.equal(result.ok, true);
  copy.aircraft[0].distanceM = 999;
  assert.equal(P.findVersion(s.get().doc, result.versionId).version.aircraft[0].distanceM, 500);
  assert.equal(match(s).version.aircraft[0].name, 'Mini');
});
test('validation rejects invalid numbers/metadata/aircraft and never changes values by operation label', () => {
  for (const key of Object.keys(P.DEFAULT_LIMITS)) {
    for (const value of ['', '0', '-1', 'NaN', 'Infinity', '100001', '1e3', '12x'])
      assert.equal(P.validateProfileDraft(draft({ [key]: value })).ok, false, key + ':' + value);
    assert.equal(P.validateProfileDraft(draft({ [key]: '812,5' })).ok, true);
  }
  for (const patch of [{ reoc: '' }, { name: '' }, { label: '' }, { label: 'x'.repeat(41) }, { manual: 'x'.repeat(501) },
    { operationType: 'CUSTOM', customOperation: '' }, { operationType: 'OTHER' }, { aircraft: [null] }, { aircraft: [...A.DEFAULT_AIRCRAFT, A.DEFAULT_AIRCRAFT[0]] }])
    assert.equal(P.validateProfileDraft(draft(patch)).ok, false);
  for (const operationType of P.OPERATIONS) {
    const parsed = P.validateProfileDraft(draft({ operationType, customOperation: 'My scope' }));
    assert.equal(parsed.ok, true); assert.deepEqual(parsed.value.version.limits, P.DEFAULT_LIMITS);
  }
});
test('invalid form returns field errors and stale edits cannot overwrite newer settings', async () => {
  const { kv, s } = await setup();
  const m = match(s), edit = P.toDraft(m.profile, m.version), t = target(s);
  const before = kv.data.get(P.PROFILES_KEY);
  const invalid = await s.save({ ...edit, maxHeightM: '0' }, t);
  assert.equal(invalid.ok, false); assert.ok(invalid.fields.maxHeightM);
  assert.equal(kv.data.get(P.PROFILES_KEY), before);
  await s.select(null);
  assert.equal((await s.save(edit, t)).ok, false);
  assert.equal(s.get().doc.activeVersionId, null);
  const refreshed = target(s, m); await s.removeVersion(m.version.id);
  assert.equal((await s.save(edit, refreshed)).ok, false);
  assert.equal(s.get().doc.profiles.length, 0);
});
test('failed saves/selections/deletes/resets preserve committed memory and disk without false success', async () => {
  const { kv, s } = await setup();
  const before = kv.data.get(P.PROFILES_KEY), state = s.get();
  const m = match(s), d = P.toDraft(m.profile, m.version); d.maxHeightM = '99';
  kv.failWrite = true;
  for (const op of [() => s.save(d, target(s)), () => s.select(null), () => s.removeVersion(m.version.id),
    () => s.removeProfile(m.profile.id), () => s.reset(m.version.id, s.get().doc.revision)]) {
    const res = await op(); assert.equal(res.ok, false); assert.ok(res.error);
    assert.equal(s.get(), state); assert.equal(kv.data.get(P.PROFILES_KEY), before);
  }
  assert.equal(d.maxHeightM, '99');
  kv.failWrite = false; assert.equal((await s.save(d, target(s))).ok, true);
});
test('queued mutations apply to last committed document without mixing selections and version contents', async () => {
  const { s, kv } = await setup();
  const [a, b] = await Promise.all([s.save(draft()), s.save(draft({ reoc: 'B', aircraft: [] }))]);
  assert.equal(a.ok, true); assert.equal(b.ok, true);
  await Promise.all([s.select(a.versionId), s.select(b.versionId)]);
  assert.equal(match(s).profile.reoc, 'B'); assert.deepEqual(match(s).version.aircraft, []);
  const again = createProfileStore(kv); await again.ready;
  assert.deepEqual(again.get().doc, s.get().doc);
});
test('deleting active version clears selection without fallback, including final profile and relaunch', async () => {
  const { s, kv } = await setup();
  const original = match(s);
  const other = await add(s);
  await s.select(other); await s.removeVersion(other);
  assert.equal(s.get().doc.activeVersionId, null);
  assert.ok(P.findVersion(s.get().doc, original.version.id));
  await s.select(original.version.id);
  await s.removeProfile(original.profile.id);
  assert.deepEqual(s.get().doc.profiles, []); assert.equal(s.get().doc.activeVersionId, null);
  const again = createProfileStore(kv); await again.ready;
  assert.deepEqual(again.get().doc.profiles, []); assert.equal(again.get().doc.activeVersionId, null);
  await add(again); assert.equal(again.get().doc.activeVersionId, null);
});
test('restoring defaults is scoped to one version; clears stale source notes and retains profile identity', async () => {
  const { s } = await setup();
  const otherId = await add(s, { maxHeightM: '90', aircraft: [], manual: 'OM limits', effectiveNote: '2026', operationType: 'BVLOS' });
  const original = P.clone(match(s));
  const revision = s.get().doc.revision;
  assert.equal((await s.reset(otherId, revision)).ok, true);
  const reset = P.findVersion(s.get().doc, otherId);
  assert.equal(reset.version.operationType, 'BVLOS'); assert.equal(reset.profile.reoc, 'ReOC A');
  assert.deepEqual(reset.version.limits, P.DEFAULT_LIMITS);
  assert.deepEqual(reset.version.aircraft, A.DEFAULT_AIRCRAFT);
  assert.equal(reset.version.manual, ''); assert.equal(reset.version.effectiveNote, '');
  assert.deepEqual(match(s), original);
  assert.equal((await s.reset(otherId, revision)).ok, false);
});
test('document validation rejects future schemas, missing selection, duplicates and unsupported sizes', () => {
  const valid = P.starterDoc();
  assert.throws(() => P.readProfiles(JSON.stringify({ ...valid, version: 2 })));
  assert.throws(() => P.readProfiles(JSON.stringify({ ...valid, activeVersionId: 'missing' })));
  assert.throws(() => P.readProfiles(JSON.stringify({ ...valid, profiles: [...valid.profiles, ...valid.profiles] })));
  assert.throws(() => P.readProfiles(' '.repeat(2_000_001)));
});

test('export/import round trip preserves versions, excludes selection, and respects replace/activate choices', async () => {
  const { s } = await setup();
  const v2 = await add(s, { reoc: 'ReOC B', name: 'Site', label: '2', manual: 'Manual 4', effectiveNote: 'note', maxHeightM: '90.5' });
  const text = P.exportProfiles(s.get().doc);
  assert.equal(text.includes('activeVersionId'), false);
  const incoming = P.parseTransfer(text);
  const fresh = await setup();
  const before = JSON.stringify(fresh.s.get().doc);
  const plan = P.planImport(fresh.s.get().doc, incoming);
  assert.ok(plan.some(p => p.isNew && p.name === 'Site'));
  const res = await fresh.s.importProfiles(incoming, fresh.s.get().doc.revision, { replaceKeys: [], activateKey: null });
  assert.equal(res.ok, true);
  const d = fresh.s.get().doc;
  assert.equal(d.activeVersionId, 'starter-version');
  const site = d.profiles.find(p => p.name === 'Site');
  assert.equal(site.versions[0].limits.maxHeightM, 90.5); assert.equal(site.versions[0].manual, 'Manual 4');
  assert.notEqual(site.id, s.get().doc.profiles.find(p => p.name === 'Site').id);
  // identical re-import adds nothing; conflict kept unless replaced
  const again = P.planImport(d, incoming);
  assert.ok(again.every(p => p.versions.every(v => v.status === 'same')));
  const changed = P.parseTransfer(text.replace('90.5', '80'));
  assert.equal(P.planImport(d, changed).flatMap(p => p.versions).find(v => v.status === 'conflict').label, '2');
  await fresh.s.importProfiles(changed, d.revision, { replaceKeys: [], activateKey: null });
  assert.equal(fresh.s.get().doc.profiles.find(p => p.name === 'Site').versions[0].limits.maxHeightM, 90.5);
  const key = P.planImport(fresh.s.get().doc, changed).flatMap(p => p.versions).find(v => v.status === 'conflict').key;
  await fresh.s.importProfiles(changed, fresh.s.get().doc.revision, { replaceKeys: [key], activateKey: key });
  const m = match(fresh.s);
  assert.equal(m.version.limits.maxHeightM, 80); assert.equal(m.profile.reoc, 'ReOC B');
  assert.notEqual(before, JSON.stringify(fresh.s.get().doc));
});
test('invalid, unexpected, stale and failing imports leave saved data and selection unchanged', async () => {
  const { kv, s } = await setup();
  const good = P.exportProfiles(s.get().doc);
  assert.throws(() => P.parseTransfer('nope'));
  assert.throws(() => P.parseTransfer(JSON.stringify({ ...JSON.parse(good), password: 'x' })));
  const withCred = JSON.parse(good); withCred.profiles[0].versions[0].credentials = 'x';
  assert.throws(() => P.parseTransfer(JSON.stringify(withCred)));
  const bad = JSON.parse(good); bad.profiles[0].versions[0].limits.peopleM = -1;
  assert.throws(() => P.parseTransfer(JSON.stringify(bad)));
  const dup = JSON.parse(good); dup.profiles.push(dup.profiles[0]);
  assert.throws(() => P.parseTransfer(JSON.stringify(dup)));
  const incoming = P.parseTransfer(good.replace('Starter reference', 'Other'));
  const snapshot = JSON.stringify(s.get().doc);
  assert.equal((await s.importProfiles(incoming, 999, { replaceKeys: [], activateKey: null })).ok, false);
  assert.equal((await s.importProfiles(incoming, s.get().doc.revision, { replaceKeys: [], activateKey: '9:9' })).ok, false);
  kv.failWrite = true;
  assert.equal((await s.importProfiles(incoming, s.get().doc.revision, { replaceKeys: [], activateKey: '0:0' })).ok, false);
  assert.equal(JSON.stringify(s.get().doc), snapshot);
  assert.equal(JSON.parse(kv.data.get(P.PROFILES_KEY)).profiles.length, 1);
});
