const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const weather = require('../lib/uav-weather.ts');
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await new Promise(setImmediate);
};

function harness({ storageValues = {}, permission = { granted: true, status: 'granted', canAskAgain: true },
  location = async () => ({ coords: { latitude: -33.945987, longitude: 151.177456, accuracy: 5 } }) } = {}) {
  const slots = [];
  const effects = [];
  const cleanups = [];
  let cursor = 0;
  let mounted = false;
  const values = new Map(Object.entries(storageValues));
  const storageCalls = [];
  const listeners = new Set();
  const state = {
    currentState: 'active',
    addEventListener(event, listener) {
      assert.equal(event, 'change');
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    change(next) {
      this.currentState = next;
      for (const listener of [...listeners]) listener(next);
    },
  };
  const locationCalls = [];
  let currentPermission = permission;
  let requestPermissionCalls = 0;
  let permissionResponse = async () => permission;
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect(effect) {
        const index = cursor++;
        if (!(index in slots)) {
          slots[index] = true;
          effects.push(effect);
        }
      },
    },
    'react-native': {
      AppState: state,
      Linking: { openSettings: async () => {} },
      Platform: { OS: 'ios' },
      Pressable: 'Pressable',
      Text: 'Text',
      View: 'View',
    },
    '@expo/vector-icons': { Feather: 'Feather' },
    '@react-native-async-storage/async-storage': {
      async getItem(key) { storageCalls.push(['getItem', key]); return values.get(key) ?? null; },
      async setItem(key, value) { storageCalls.push(['setItem', key, value]); values.set(key, value); },
      async removeItem(key) { storageCalls.push(['removeItem', key]); values.delete(key); },
    },
    'expo-location': {
      Accuracy: { High: 'high' },
      useForegroundPermissions: () => [currentPermission, async () => {
        requestPermissionCalls++;
        currentPermission = await permissionResponse();
        return currentPermission;
      }],
      getCurrentPositionAsync: async options => {
        locationCalls.push(options);
        return location();
      },
    },
    './Accordion': { Accordion: 'Accordion' },
    './FieldKit': {
      ActionButton: 'ActionButton',
      Badge: 'Badge',
      Callout: 'Callout',
      Panel: 'Panel',
      SectionHeading: 'SectionHeading',
    },
    '../hooks/useColors': { useColors: () => ({ foreground: 'black', mutedForeground: 'gray' }) },
    '../lib/uav-weather': weather,
  };
  const output = ts.transpileModule(fs.readFileSync(path.join(root, 'components/UavWeather.tsx'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name),
    mod, mod.exports,
  );

  const render = () => {
    cursor = 0;
    const tree = mod.exports.UavWeather();
    if (!mounted) {
      mounted = true;
      for (const effect of effects.splice(0)) {
        const cleanup = effect();
        if (typeof cleanup === 'function') cleanups.push(cleanup);
      }
    }
    return tree;
  };
  const unmount = () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    mounted = false;
  };
  return {
    render, unmount, state, values, storageCalls, locationCalls,
    setPermission(next, requestResult = async () => next) {
      currentPermission = next;
      permissionResponse = requestResult;
    },
    get requestPermissionCalls() { return requestPermissionCalls; },
  };
}

function all(node, predicate) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, predicate));
  if (typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
}
const element = (tree, id) => all(tree, node => node.props?.testID === id)[0];
const text = node => {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
};
const defer = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function forecastResponse() {
  return new Response(JSON.stringify({
    latitude: -33.95,
    longitude: 151.18,
    utc_offset_seconds: 0,
    hourly_units: {},
    hourly: { time: ['2026-11-10T04:00'] },
  }), { status: 200 });
}
async function consent(h) {
  element(h.render(), 'weather-consent').props.onPress();
  await flush();
}
async function startRefresh(h) {
  element(h.render(), 'weather-refresh').props.onPress();
  await flush();
}
async function ready(h) {
  h.render();
  await flush();
}

test('mount and app resume never fetch weather automatically', async () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls++; return forecastResponse(); };
  const h = harness({ storageValues: { [weather.WEATHER_CONSENT_KEY]: 'accepted' } });
  try {
    await ready(h);
    h.render();
    h.state.change('background');
    h.state.change('active');
    await flush();
    assert.equal(fetchCalls, 0);
    assert.equal(h.locationCalls.length, 0);
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('no consent prevents a weather request even if the disabled action is invoked', async () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls++; return forecastResponse(); };
  const h = harness();
  try {
    await ready(h);
    const button = element(h.render(), 'weather-refresh');
    assert.equal(button.props.disabled, true);
    button.props.onPress();
    await flush();
    assert.equal(fetchCalls, 0);
    assert.equal(h.locationCalls.length, 0);
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('denied location permission sends no request and can recover after permission is granted', async () => {
  const originalFetch = global.fetch;
  const fetchCalls = [];
  global.fetch = async (url, options) => {
    fetchCalls.push([url, options]);
    return forecastResponse();
  };
  const h = harness({ permission: { granted: false, status: 'denied', canAskAgain: true } });
  try {
    await ready(h);
    await consent(h);
    await startRefresh(h);
    assert.equal(h.requestPermissionCalls, 1);
    assert.equal(h.locationCalls.length, 0);
    assert.equal(fetchCalls.length, 0);
    assert.match(text(h.render()), /Location permission denied/);

    h.setPermission({ granted: true, status: 'granted', canAskAgain: true });
    await startRefresh(h);
    assert.equal(h.locationCalls.length, 1);
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0][0], /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    assert.equal(new URL(fetchCalls[0][0]).searchParams.get('latitude'), '-33.946');
    assert.equal(new URL(fetchCalls[0][0]).searchParams.get('longitude'), '151.177');
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('backgrounding aborts the active provider request and preserves the saved forecast', async () => {
  const originalFetch = global.fetch;
  const pending = defer();
  let signal;
  global.fetch = (url, options) => {
    assert.match(url, /^https:\/\/api\.open-meteo\.com\//);
    signal = options.signal;
    return pending.promise;
  };
  const existing = JSON.stringify({
    version: 1, latitude: -33.946, longitude: 151.177, retrievedAt: new Date(Date.now() - 31 * 60000).toISOString(),
    payload: { latitude: -33.95, longitude: 151.18, utc_offset_seconds: 0, hourly_units: {}, hourly: { time: ['2026-11-10T04:00'] } },
  });
  const h = harness({ storageValues: {
    [weather.WEATHER_CONSENT_KEY]: 'accepted',
    [weather.WEATHER_CACHE_KEY]: existing,
  } });
  try {
    await ready(h);
    await startRefresh(h);
    await flush();
    assert.ok(signal);
    h.state.change('background');
    assert.equal(signal.aborted, true);
    pending.resolve(forecastResponse());
    await flush();
    assert.equal(h.values.get(weather.WEATHER_CACHE_KEY), existing);
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('a GPS fix resolving after background and resume cannot start a weather request', async () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls++; return forecastResponse(); };
  const gps = defer();
  const h = harness({ location: () => gps.promise });
  try {
    await ready(h);
    await consent(h);
    await startRefresh(h);
    await flush();
    assert.equal(h.locationCalls.length, 1);
    h.state.change('background');
    h.state.change('active');
    gps.resolve({ coords: { latitude: -33.945987, longitude: 151.177456, accuracy: 5 } });
    await flush();
    assert.equal(fetchCalls, 0);
    assert.equal(h.values.has(weather.WEATHER_CACHE_KEY), false);
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('revoking consent persists across remount and clearing removes saved weather and consent', async () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls++; return forecastResponse(); };
  const cache = JSON.stringify({
    version: 1, latitude: -33.946, longitude: 151.177, retrievedAt: '2026-11-10T04:00:00.000Z',
    payload: { latitude: -33.95, longitude: 151.18, utc_offset_seconds: 0, hourly_units: {}, hourly: { time: ['2026-11-10T04:00'] } },
  });
  const h = harness({ storageValues: {
    [weather.WEATHER_CONSENT_KEY]: 'accepted',
    [weather.WEATHER_CACHE_KEY]: cache,
  } });
  try {
    await ready(h);
    element(h.render(), 'weather-consent').props.onPress();
    await flush();
    assert.equal(h.values.has(weather.WEATHER_CONSENT_KEY), false);
    assert.equal(element(h.render(), 'weather-consent').props.accessibilityState.checked, false);

    h.unmount();
    const remounted = harness({ storageValues: Object.fromEntries(h.values) });
    try {
      await ready(remounted);
      const refresh = element(remounted.render(), 'weather-refresh');
      assert.equal(refresh.props.disabled, true);
      refresh.props.onPress();
      await flush();
      assert.equal(fetchCalls, 0);

      const clear = element(remounted.render(), 'weather-clear');
      assert.ok(clear);
      clear.props.onPress();
      await flush();
      assert.equal(remounted.values.has(weather.WEATHER_CACHE_KEY), false);
      assert.equal(remounted.values.has(weather.WEATHER_CONSENT_KEY), false);
      assert.doesNotMatch(text(remounted.render()), /Saved requested area:/);

      remounted.unmount();
      const afterClear = harness({ storageValues: Object.fromEntries(remounted.values) });
      try {
        await ready(afterClear);
        assert.equal(element(afterClear.render(), 'weather-consent').props.accessibilityState.checked, false);
        assert.equal(element(afterClear.render(), 'weather-refresh').props.disabled, true);
      } finally {
        afterClear.unmount();
      }
    } finally {
      remounted.unmount();
    }
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});

test('unmount aborts a pending request and a late response cannot overwrite saved weather', async () => {
  const originalFetch = global.fetch;
  const pending = defer();
  let signal;
  global.fetch = (_url, options) => {
    signal = options.signal;
    return pending.promise;
  };
  const existing = JSON.stringify({
    version: 1, latitude: -33.946, longitude: 151.177, retrievedAt: '2026-11-10T04:00:00.000Z',
    payload: { latitude: -33.95, longitude: 151.18, utc_offset_seconds: 0, hourly_units: {}, hourly: { time: ['2026-11-10T04:00'] } },
  });
  const h = harness({ storageValues: {
    [weather.WEATHER_CONSENT_KEY]: 'accepted',
    [weather.WEATHER_CACHE_KEY]: existing,
  } });
  try {
    await ready(h);
    await startRefresh(h);
    await flush();
    assert.ok(signal);
    h.unmount();
    assert.equal(signal.aborted, true);
    pending.resolve(forecastResponse());
    await flush();
    assert.equal(h.values.get(weather.WEATHER_CACHE_KEY), existing);
  } finally {
    h.unmount();
    global.fetch = originalFetch;
  }
});
