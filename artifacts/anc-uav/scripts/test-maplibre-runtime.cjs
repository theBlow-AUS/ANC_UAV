const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function runtime(environment, missing = new Set()) {
  const probes = [];
  const source = fs.readFileSync(path.join(__dirname, '../lib/maplibre-runtime.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports,
    require(id) {
      if (id === 'expo-constants') return {
        __esModule: true, default: { executionEnvironment: environment },
        ExecutionEnvironment: { StoreClient: 'storeClient' },
      };
      if (id === 'react-native') return { TurboModuleRegistry: { get(name) {
        probes.push(name);
        return missing.has(name) ? null : {};
      } } };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return { available: exports.hasMapLibreNative(), probes };
}

test('Expo Go skips all native-module probes', () => {
  const result = runtime('storeClient');
  assert.equal(result.available, false);
  assert.equal(result.probes.length, 0);
});
test('a complete native build enables MapLibre', () => {
  assert.equal(runtime('standalone').available, true);
});
test('missing camera or offline storage safely disables MapLibre', () => {
  for (const name of ['MLRNCameraModule', 'MLRNOfflineModule'])
    assert.equal(runtime('standalone', new Set([name])).available, false);
});

for (const [file, name, fallback, native] of [
  ['OfflineMap.native.tsx', 'OfflineMap', 'ReferenceMap', 'MapLibreMap'],
  ['OfflineTileManager.native.tsx', 'OfflineTileManager', 'OfflineTileManager', 'NativeTileManager'],
]) {
  for (const available of [false, true]) test(`${file}: safe evaluation and correct selection, native=${available}`, () => {
    const exports = {};
    const fallbackComponent = () => null;
    vm.runInNewContext(ts.transpileModule(
      fs.readFileSync(path.join(__dirname, '../components', file), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
    ).outputText, {
      exports,
      require(id) {
        if (id === '@maplibre/maplibre-react-native') throw new Error('MapLibre loaded before capability-gated render');
        if (id === '../lib/maplibre-runtime') return { hasMapLibreNative: () => available };
        if (id === './ReferenceMap' || id === './OfflineTileManager.web') return { [fallback]: fallbackComponent };
        if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
        return {};
      },
    });
    const element = exports[name]({});
    if (available) assert.equal(element.type.name, native);
    else assert.equal(element.type, fallbackComponent);
  });
}
