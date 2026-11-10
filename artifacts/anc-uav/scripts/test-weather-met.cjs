const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { explainMetBriefing } = require('../lib/met-briefing.ts');
const W = require('../lib/uav-weather.ts');

// Synthetic, de-identified adaptation of the supplied structure.
const sample = `GENERAL MET MESSAGE BRIEFING
ISSUED AT 1700Z ON THE 09/11/2026 [0400 ON THE 10/11/2026 LOCAL]
SYDNEY TAF: (THIS TAF MAY NOT BE THE LATEST ISSUE)
TAF YSSY 091711Z 0918/1100
30006KT 9999 FEW030
FM100000 03012KT CAVOK
FM100400 06018KT CAVOK
FM100800 03012KT CAVOK
FM101200 01006KT CAVOK
FM101400 31005KT CAVOK
PROB30 INTER 1021/1100 VRB30G45KT 4000 TSRA SCT030 SCT090CB
RMK
T 13 15 21 23 Q 1018 1019 1017 1015

TAF SUMMARY:
FINE CONDITIONS THROUGH MUCH OF THE PERIOD.
THUNDERSTORM POTENTIAL WITHIN THE TMA (CIRCLE TO 45NM RADIUS):
50% CHANCE APPROACHING FROM THE WEST 1019-1100Z
OTHER POSSIBILITIES:
- 20% CHANCE OF THUNDERSTORMS EARLIER
SYDNEY OUTLOOK:
WEDNESDAY: POSSIBLE SHOWER OR STORM.
NOTES:
THIS BRIEFING IS NOT AMENDED BETWEEN ROUTINE ISSUES.`;

test('sample keeps wrapper, TAF issue and airport probability separate from TMA narrative', () => {
  const result = explainMetBriefing(sample);
  assert.equal(result.original, sample);
  assert.match(result.blocks.find(b => b.title === 'TAF · YSSY').lines.join(' '), /day 9, 17:11 UTC/);
  assert.equal(result.blocks.filter(b => b.title.includes('(FM)')).length, 5);
  const probability = result.blocks.find(b => b.title === 'PROB30 INTER');
  assert.match(probability.lines.join(' '), /30% probability.*less than 30 minutes/);
  assert.match(probability.lines.join(' '), /variable direction.*30 kt.*45 kt/);
  assert.match(probability.lines.join(' '), /4000 m.*Thunderstorms.*9000 ft.*cumulonimbus/);
  assert.match(result.blocks.find(b => b.title.startsWith('THUNDERSTORM POTENTIAL')).source, /50% CHANCE/);
  assert.ok(result.warnings.some(w => /may not be the latest/.test(w)));
  assert.ok(result.warnings.some(w => /not amended between routine/.test(w)));
});
test('cloud bases are above aerodrome, CAVOK is not clear-sky or UAV clearance', () => {
  const result = explainMetBriefing(sample);
  const base = result.blocks.find(b => b.title === 'Initial prevailing conditions');
  assert.match(base.lines.join(' '), /3000 ft above the aerodrome/);
  assert.match(result.blocks.find(b => b.title.includes('(FM)')).lines.join(' '), /does not mean clear sky or safe UAV/);
  assert.match(result.blocks.find(b => b.title === 'TAF remarks (RMK)').lines.join(' '), /13, 15, 21, 23 °C.*1018, 1019, 1017, 1015 hPa/);
});
test('unknown codes are retained and amendments, TEMPO and BECMG are not merged', () => {
  const result = explainMetBriefing('TAF AMD YSSY 101000Z 1012/1118 00000KT 9999 XYZ\nTEMPO 1013/1015 02010KT 0500 FG\nBECMG 1015/1017 04012KT CAVOK');
  assert.ok(result.blocks.some(b => b.title.includes('amended')));
  assert.ok(result.blocks.some(b => b.title === 'TEMPO' && b.lines.join(' ').includes('less than 60 minutes')));
  assert.ok(result.blocks.some(b => b.title === 'BECMG'));
  assert.ok(result.blocks.some(b => b.unknown.includes('XYZ')));
});
test('invalid or unsupported briefings do not produce an authoritative forecast', () => {
  assert.throws(() => explainMetBriefing('  '), /Paste/);
  assert.throws(() => explainMetBriefing(sample + '\n' + sample), /one TAF at a time/);
  assert.throws(() => explainMetBriefing('x'.repeat(30001)), /30,000/);
  assert.ok(explainMetBriefing('TAF YSSY 999999Z 9999/9999 999999KT').blocks.some(b => b.lines.includes('Issue time not interpreted.')));
  assert.ok(explainMetBriefing('METAR YSSY 100400Z 06018KT').warnings.some(w => /No supported TAF header/.test(w)));
});
test('MET reader never uses a remote request', () => {
  const before = global.fetch;
  global.fetch = () => { throw new Error('Unexpected network'); };
  try { assert.ok(explainMetBriefing(sample).blocks.length); } finally { global.fetch = before; }
  const ui = fs.readFileSync(require.resolve('../components/MetBriefingExplainer.tsx'), 'utf8');
  assert.doesNotMatch(ui, /\bfetch\(|AsyncStorage|api-client|analytics/);
});

function cache() {
  const units = {
    temperature_2m: '°C', relative_humidity_2m: '%', cloud_cover: '%', visibility: 'm',
    precipitation_probability: '%', precipitation: 'mm',
    wind_speed_10m: 'm/s', wind_direction_10m: '°', wind_gusts_10m: 'm/s',
    wind_speed_80m: 'm/s', wind_direction_80m: '°', wind_speed_120m: 'm/s', wind_direction_120m: '°',
  };
  const hourly = { time: ['2026-11-10T04:00', '2026-11-10T05:00', '2026-11-10T06:00'] };
  for (const key of Object.keys(units)) hourly[key] = [null, null, null];
  hourly.wind_speed_10m = [0, 3, 4];
  hourly.wind_speed_120m = [9, 10, 11];
  hourly.precipitation_probability = [0, 20, 80];
  return { version: 1, latitude: -33.946, longitude: 151.177, retrievedAt: '2026-11-10T04:00:00.000Z',
    payload: { latitude: -33.95, longitude: 151.18, utc_offset_seconds: 0, hourly_units: units, hourly } };
}
test('weather parser distinguishes zero, missing values, units and forecast times', () => {
  const result = W.parseWeatherCache(cache());
  assert.equal(result.hours[0].wind_speed_10m, 0);
  assert.equal(result.hours[0].wind_gusts_10m, null);
  assert.equal(result.hours[0].precipitation_probability, 0);
  assert.equal(result.hours[0].time, '2026-11-10T04:00:00.000Z');
  assert.equal(W.weatherHoursNow(result, Date.parse('2026-11-10T04:19Z')).length, 3);
  assert.equal(W.weatherHoursNow(result, Date.parse('2026-11-11T04:19Z')).length, 0);
  assert.match(W.weatherAge(result, Date.parse('2026-11-10T08:00Z')), /over 3 hours old/);
});
test('missing height data is not inferred; invalid fields cannot become valid cached weather', () => {
  const missing = cache(); delete missing.payload.hourly.wind_speed_120m;
  assert.equal(W.parseWeatherCache(missing).hours[0].wind_speed_120m, null);
  for (const mutate of [
    c => c.payload.hourly_units.wind_speed_10m = 'km/h',
    c => c.payload.hourly.wind_speed_10m = [1000, 3, 4],
    c => c.payload.utc_offset_seconds = 36000,
    c => c.payload.hourly.time[0] = '2026-02-30T04:00',
    c => c.payload.hourly.precipitation_probability[0] = 101,
    c => c.payload.hourly.visibility = [1],
  ]) { const invalid = cache(); mutate(invalid); assert.throws(() => W.parseWeatherCache(invalid)); }
});
test('only rounded coordinates are placed in the direct provider URL', () => {
  const url = new URL(W.weatherRequestUrl(-33.945987, 151.177456));
  assert.equal(url.host, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('latitude'), '-33.946');
  assert.equal(url.searchParams.get('longitude'), '151.177');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'ms');
  assert.equal(url.searchParams.get('timezone'), 'GMT');
  assert.equal(url.searchParams.has('apikey'), false);
  assert.throws(() => W.weatherRequestUrl(NaN, 0));
});
test('weather downloads validate a provider response and fail explicitly on limits and bad data', async () => {
  const fixture = cache();
  let calls = 0;
  const downloaded = await W.downloadWeather(-33.945987, 151.177456, undefined, async (url, options) => {
    calls++; assert.match(url, /^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
    assert.equal(options.body, undefined);
    return new Response(JSON.stringify(fixture.payload), { status: 200 });
  });
  assert.equal(calls, 1);
  assert.equal(downloaded.cache.latitude, -33.946);
  assert.equal(downloaded.snapshot.hours.length, 3);
  await assert.rejects(W.downloadWeather(0, 0, undefined, async () => new Response('', { status: 429 })), /rate limit/);
  await assert.rejects(W.downloadWeather(0, 0, undefined, async () => new Response('<html>bad</html>')), /unreadable/);
});
test('weather has no automatic retrieval path; placement and local reading stay separate', () => {
  const ui = fs.readFileSync(require.resolve('../components/UavWeather.tsx'), 'utf8');
  assert.doesNotMatch(ui.slice(ui.indexOf('useEffect(()'), ui.indexOf('async function toggleConsent')), /downloadWeather\(|refresh\(/);
  const aviate = fs.readFileSync(require.resolve('../app/(tabs)/index.tsx'), 'utf8');
  assert.ok(aviate.indexOf('<UavWeather') < aviate.indexOf('label="Traffic call script"'));
  const navigate = fs.readFileSync(require.resolve('../app/(tabs)/navigate.tsx'), 'utf8');
  assert.match(navigate, /<MetBriefingExplainer\s*\/>\s*<\/Screen>/);
});
