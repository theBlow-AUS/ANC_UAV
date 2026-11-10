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
    react: { useState: state, useRef: initial => state(() => ({ current: initial }))[0] },
    'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable', Platform: { OS: 'ios' }, Linking: { openSettings: async () => {} } },
    '@expo/vector-icons': { Feather: 'Feather' },
    'expo-router': { router: { navigate() {} } },
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
  assert.match(read('app/(tabs)/settings.tsx'), /ui\.contacts\.filter\(k => k\.id === '000'\)\.map/);
});
