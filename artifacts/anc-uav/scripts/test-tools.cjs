const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const geo = require('../lib/geo.ts');
const airspace = require('../lib/airspace.ts');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const fields = Object.fromEntries(['ActionButton', 'Callout', 'Grid', 'Panel', 'Seg', 'TextField', 'Verdict'].map(n => [n, n]));

// Lightweight function-component harness, not a browser/device test. Hook slots
// let us exercise handlers and rerenders without a native runtime or extra deps.
function harness(file, overrides = {}) {
  const slots = [];
  let cursor = 0;
  const state = initial => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
  };
  const mocks = {
    react: { useState: state, useRef: initial => state(() => ({ current: initial }))[0], useEffect() {} },
    'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable', Platform: { OS: 'ios' }, Linking: { openSettings: async () => {} } },
    '@expo/vector-icons': { Feather: 'Feather' },
    'expo-router': { router: { navigate() {}, setParams() {} }, useLocalSearchParams: () => ({}) },
    '@/components/FieldKit': { ...fields, DISPLAY: 'Test' },
    '@/hooks/useColors': { useColors: () => ({ foreground: 'black', mutedForeground: 'gray', card: 'white', signal: 'yellow', ink: 'black', onSignal: 'black', destructive: 'red' }) },
    '@/hooks/useUi': { useUi: () => ({ fs: n => n, unit: 'km', crew: 'multi', text: 1 }) },
    '@/lib/ui-store': {
      setUi() {},
      cleanDialString: v => /^\+?[0-9 ]+$/.test(v.trim()) && v.trim().replace(/\s/g, '').replace('+', '').length >= 3 ? v.trim().replace(/\s/g, '') : null,
      isEmergencyDialString: v => v.trim().replace(/\s/g, '').replace('+', '') === '000',
    },
    'expo-location': { useForegroundPermissions: () => [{ granted: true }, async () => ({ granted: true })],
      Accuracy: { High: 'high' }, getCurrentPositionAsync: async () => ({ coords: { latitude: -33, longitude: 151, accuracy: 5 }, timestamp: 1000 }) },
    './FieldKit': { ...fields, DISPLAY: 'Test' },
    '../hooks/useColors': { useColors: () => ({ foreground: 'black', mutedForeground: 'gray', card: 'white', signal: 'yellow', ink: 'black', destructive: 'red' }) },
    '../hooks/useUi': { useUi: () => ({ fs: n => n, unit: 'km' }) },
    '../lib/ui-store': { setUi() {} },
    '../context/NavigationContext': { useNavigation: () => ({ query: { position: null }, setQuery() {} }) },
    '../lib/geo': geo, '../lib/airspace': airspace,
    ...overrides,
  };
  const output = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => mocks[name] ?? require(name), mod, mod.exports);
  return { exports: mod.exports, render(fn, props = {}) { cursor = 0; return fn(props); } };
}
function all(node, predicate) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(n => all(n, predicate));
  if (typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
}
const field = (tree, id) => all(tree, n => n.props?.testID === id)[0];
const text = node => {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
};

test('six tools live only in Tools, which precedes Settings', () => {
  const tools = read('app/(tabs)/tools.tsx'), tabs = read('app/(tabs)/_layout.tsx');
  assert.equal((tools.match(/<Accordion /g) || []).length, 6);
  for (const name of ['NotamExplainer', 'MetBriefingExplainer', 'DistanceConverter', 'CoordinateCalculator', 'AerodromeDistanceComparison', 'AircraftWeatherComparison'])
    assert.match(tools, new RegExp(`<${name}\\b`));
  assert.ok(tabs.indexOf('name="map"') < tabs.indexOf('name="tools"'));
  assert.ok(tabs.indexOf('name="tools"') < tabs.indexOf('name="settings"'));
  assert.doesNotMatch(read('app/(tabs)/comms.tsx'), /NotamExplainer/);
  assert.doesNotMatch(read('app/(tabs)/navigate.tsx'), /MetBriefingExplainer|aerodromeComparison|windComparison|tempComparison/);
  assert.doesNotMatch(read('app/(tabs)/map.tsx'), /unit-converter-input|origin-latitude|destination-latitude/);
});

test('accordion retains the identical child tree when closed and supports independent state', () => {
  const a = harness('components/Accordion.tsx');
  const child = { type: 'DraftWithState', props: { children: 'typed input' } };
  const props = { title: 'Tool', testID: 'tool', children: child };
  let tree = a.render(a.exports.Accordion, props);
  const body = n => all(n, el => el.props?.importantForAccessibility)[0];
  assert.equal(field(tree, 'tool-toggle').props.accessibilityState.expanded, false);
  assert.equal(body(tree).props.style.display, 'none');
  assert.equal(body(tree).props.children.props.children, child);
  field(tree, 'tool-toggle').props.onPress();
  tree = a.render(a.exports.Accordion, props);
  assert.equal(body(tree).props.style.display, 'flex');
  assert.equal(body(tree).props.accessibilityElementsHidden, false);
  field(tree, 'tool-toggle').props.onPress();
  tree = a.render(a.exports.Accordion, props);
  assert.equal(body(tree).props.children.props.children, child);
  assert.equal(body(tree).props.accessibilityElementsHidden, true);
  const b = harness('components/Accordion.tsx');
  assert.equal(field(b.render(b.exports.Accordion, props), 'tool-toggle').props.accessibilityState.expanded, false);
});

test('distance conversion handles both directions, zero, invalid input and overflow', () => {
  const h = harness('components/CalculationTools.tsx'), render = () => h.render(h.exports.DistanceConverter);
  let tree = render();
  field(tree, 'unit-converter-input').props.onChangeText('1852');
  tree = render(); assert.match(text(tree), /1000\.000 NM/);
  all(tree, n => n.type === 'Seg')[0].props.onChange('nm');
  tree = render(); assert.match(text(tree), /3429\.904 km/);
  for (const value of ['-1', 'abc', '1e309', '1e308']) {
    field(tree, 'unit-converter-input').props.onChangeText(value);
    tree = render(); assert.match(text(tree), /finite, non-negative distance/);
  }
  field(tree, 'unit-converter-input').props.onChangeText('0');
  assert.match(text(render()), /0\.000 km/);
});

test('aerodrome and weather reference comparisons retain existing semantics', () => {
  const h = harness('components/CalculationTools.tsx');
  let tree = h.render(h.exports.AerodromeDistanceComparison);
  field(tree, 'navigate-distance').props.onChangeText('5.5');
  tree = h.render(h.exports.AerodromeDistanceComparison);
  assert.equal(all(tree, n => n.type === 'Verdict')[0].props.title, 'Inside mockup figure');
  assert.match(text(tree), /not regulatory rules/);
  const w = harness('components/CalculationTools.tsx');
  tree = w.render(w.exports.AircraftWeatherComparison);
  field(tree, 'tools-wind').props.onChangeText('13');
  field(tree, 'tools-temperature').props.onChangeText('51');
  tree = w.render(w.exports.AircraftWeatherComparison);
  assert.deepEqual(all(tree, n => n.type === 'Verdict').map(n => n.props.title), ['Above mockup figure', 'Outside mockup range']);
  assert.match(text(tree), /do not use your active operating profile/);
});

test('coordinate calculator computes distance/bearing, labels GPS and invalidates edited fix label', async () => {
  const h = harness('components/CoordinateCalculator.tsx'), render = () => h.render(h.exports.CoordinateCalculator);
  let tree = render();
  for (const [id, v] of [['tools-a-lat', '-33'], ['tools-a-lon', '151'], ['tools-b-lat', '-34'], ['tools-b-lon', '151']])
    field(tree, id).props.onChangeText(v);
  tree = render(); assert.match(text(tree), /111\.20\s+km/); assert.match(text(tree), /180°/);
  await field(tree, 'tools-coordinate-gps').props.onPress();
  tree = render(); assert.match(text(tree), /One-time GPS fix/);
  field(tree, 'tools-a-lat').props.onChangeText('91');
  tree = render(); assert.doesNotMatch(text(tree), /One-time GPS fix/);
  assert.match(text(tree), /Enter valid latitude/);
});

test('map taps, GPS and measurement output remain outside disclosures; incident summaries keep frequencies visible', () => {
  const map = read('app/(tabs)/map.tsx'), comms = read('app/(tabs)/comms.tsx');
  assert.match(map, /<OfflineMap/);
  assert.match(map, /testID="tap-origin-mode"/);
  assert.match(map, /testID="tap-destination-mode"/);
  assert.match(map, /label="Use current location"/);
  assert.match(map, /Initial true bearing/);
  assert.ok(comms.indexOf('Loss of tower comms') < comms.indexOf('<Accordion'));
  assert.match(comms, /summary=.*visibleAssignments/s);
  assert.match(read('app/(tabs)/settings.tsx'), /ANC UAV does not place emergency calls/);
});

test('first Multi-Crew COM rail button selects crew-message view on Aviate; second still opens Comms', () => {
  const navigations = [], ui = { crew: 'multi' };
  const h = harness('components/PriorityRail.tsx', {
    'expo-router': { router: { navigate: route => navigations.push(route) } },
    '@/hooks/useUi': { useUi: () => ({ crew: ui.crew }) },
    '@/lib/ui-store': { setUi: patch => Object.assign(ui, patch) },
  });
  let tree = h.render(h.exports.PriorityRail, { current: 'aviate' });
  const steps = all(tree, n => n.type === 'Pressable' && /^Step \d:/.test(n.props.accessibilityLabel));
  assert.equal(steps.length, 5);
  tree = h.render(h.exports.PriorityRail, { current: 'comms' });
  const commsSteps = all(tree, n => n.type === 'Pressable' && /^Step \d:/.test(n.props.accessibilityLabel));
  assert.deepEqual(commsSteps.map(n => n.props.style.backgroundColor), ['white', 'white', 'white', 'yellow', 'white']);
  tree = h.render(h.exports.PriorityRail, { current: 'aviate' });
  const aviateSteps = all(tree, n => n.type === 'Pressable' && /^Step \d:/.test(n.props.accessibilityLabel));
  assert.deepEqual(aviateSteps.map(n => n.props.style.backgroundColor), ['white', 'yellow', 'white', 'white', 'white']);
  steps.splice(0, steps.length, ...aviateSteps);
  steps[0].props.onPress();
  assert.deepEqual(navigations[0], { pathname: '/', params: { internalComms: '1' } });
  steps[3].props.onPress();
  assert.equal(navigations[1], '/comms');
  assert.match(read('app/(tabs)/index.tsx'), /Communicate internally, with your crew, constantly\./);
  assert.doesNotMatch(read('app/(tabs)/index.tsx'), /CallButton|EMERGENCY/);
});

test('crew-message route shows the banner on Aviate while leaving its aircraft content in place', () => {
  const h = harness('app/(tabs)/index.tsx', {
    'expo-router': { router: { navigate() {}, setParams() {} }, useLocalSearchParams: () => ({ internalComms: '1' }) },
    '@/hooks/useUi': { useUi: () => ({ crew: 'multi', fs: n => n }) },
    '@/components/ActiveProfile': { ActiveProfile: 'ActiveProfile' },
    '@/components/PriorityRail': { PriorityRail: 'PriorityRail' },
    '@/components/UavWeather': { UavWeather: 'UavWeather' },
    '@/context/AppDataContext': { useAppData: () => ({ storageError: null }) },
  });
  const tree = h.render(h.exports.default);
  assert.ok(all(tree, n => n.type === 'Text' && text(n).includes('Communicate internally, with your crew, constantly.')).length);
  assert.ok(all(tree, n => n.type === 'ActiveProfile').length);
  assert.ok(all(tree, n => n.type === 'UavWeather').length);
  const rail = all(tree, n => n.type === 'PriorityRail')[0];
  assert.equal(rail.props.selectedIndex, 0);
});

test('an emergency-number contact cannot invoke the phone link even if passed directly', () => {
  const calls = [], h = harness('components/CallButton.tsx', {
    'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable', Linking: { openURL: async url => calls.push(url) } },
    '@/lib/ui-store': {
      cleanDialString: v => /^\+?[0-9 ]+$/.test(v.trim()) && v.trim().replace(/\s/g, '').replace('+', '').length >= 3 ? v.trim().replace(/\s/g, '') : null,
      isEmergencyDialString: v => v.trim().replace(/\s/g, '').replace('+', '') === '000',
    },
  });
  const props = { contact: { id: 'legacy', name: 'Emergency services', number: '000' } };
  let tree = h.render(h.exports.CallButton, props);
  field(tree, 'call-legacy').props.onPress();
  tree = h.render(h.exports.CallButton, props);
  all(tree, n => n.type === 'Pressable')[0].props.onPress();
  tree = h.render(h.exports.CallButton, props);
  assert.deepEqual(calls, []);
  assert.match(text(tree), /ANC UAV does not place emergency calls/);
});

test('legacy 000 contacts are removed on load and cannot be reintroduced into saved preferences', async () => {
  let saved = JSON.stringify({ contacts: [
    { id: '000', name: 'Emergency services', number: '000' },
    { id: '000', name: 'Old emergency entry', number: '0400123456' },
    { id: 'legacy-label', name: 'Emergency services', number: '00 0' },
    { id: 'ops', name: 'Operations', number: '123456' },
  ] });
  let written = '';
  const storage = { getItem: async () => saved, setItem: async (_key, value) => { written = value; } };
  const mod = { exports: {} };
  const output = ts.transpileModule(read('lib/ui-store.ts'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  new Function('require', 'module', 'exports', output)((name) => name === '@react-native-async-storage/async-storage'
    ? storage : name === 'react' ? { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() } : require(name), mod, mod.exports);
  await new Promise(setImmediate);
  assert.deepEqual(mod.exports.useUiStore().contacts.map(c => c.id), ['ops']);
  assert.equal(mod.exports.isEmergencyDialString('00 0'), true);
  mod.exports.setUi({ contacts: [
    { id: 'new-emergency', name: 'Emergency', number: '000' },
    { id: 'new-ops', name: 'Ops', number: '0400123456' },
  ] });
  await new Promise(setImmediate); await new Promise(setImmediate);
  saved = written;
  assert.deepEqual(JSON.parse(saved).contacts.map(c => c.id), ['new-ops']);
  assert.doesNotMatch(read('components/CallButton.tsx'), /tel:\$\{dial\}[\s\S]{0,150}openURL/);
});
