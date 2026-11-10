const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { explainMetBriefing } = require('../lib/met-briefing.ts');
const W = require('../lib/uav-weather.ts');
const observations = require('./fixtures/met-observations.json');

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
  assert.ok(explainMetBriefing('METAR YZZZ 100400Z 06018KT').blocks.some(b => /observation/.test(b.title)));
});
test('METAR keeps station, observation time, AUTO, gust units and original text', () => {
  const result = explainMetBriefing(observations.routine);
  assert.equal(result.original, observations.routine);
  assert.equal(result.blocks.length, 1);
  const block = result.blocks[0];
  assert.equal(block.title, 'METAR · YZZZ · observation');
  assert.equal(block.source, observations.routine.slice(0, -1));
  assert.match(block.lines.join(' '), /Routine observation.*YZZZ.*day 10, 04:00 UTC.*100400Z.*not a forecast/);
  assert.match(block.lines.join(' '), /AUTO: automated.*60° true.*18 kt.*28 kt.*30° and 90° true/);
  assert.match(block.lines.join(' '), /10 km or more.*Light rain showers.*3000 ft above the aerodrome.*cumulonimbus.*23 °C.*17 °C.*1018 hPa/);
  assert.equal(block.unknown.length, 0);
  assert.match(result.warnings.join(' '), /not a forecast.*GPS position.*do not provide a low-altitude wind profile.*No operational clearance/);
});
test('SPECI preserves COR, negative temperatures, source pressure units and unknown groups', () => {
  const result = explainMetBriefing(observations.special);
  const block = result.blocks[0];
  assert.equal(block.title, 'SPECI · YZZY · observation');
  assert.match(block.lines.join(' '), /Special observation.*day 31, 23:59 UTC.*COR: corrected.*Calm.*0 m\/s.*800 m.*vertical visibility not available.*−02 °C.*−05 °C.*29.92 inHg/);
  assert.deepEqual(block.unknown, ['R09/0600U', 'REBLSN', 'XYZ']);
  assert.ok(result.warnings.some(w => /uninterpreted/.test(w)));
  const remarks = result.blocks.find(b => b.title.includes('remarks'));
  assert.equal(remarks.source, 'RMK 1018 RF00.0/000.0');
  assert.deepEqual(remarks.unknown, ['RMK', '1018', 'RF00.0/000.0']);
  assert.doesNotMatch(remarks.lines.join(' '), /1018 m|1018 hPa/);
});
test('observation trends never become observed conditions or TAF change groups', () => {
  const result = explainMetBriefing(observations.trend);
  assert.match(result.blocks[0].lines.join(' '), /COR: corrected.*variable direction.*3 m\/s.*CAVOK/);
  assert.doesNotMatch(result.blocks[0].lines.join(' '), /400 m|Fog|200 ft/);
  const trend = result.blocks[1];
  assert.match(trend.title, /trend forecast \(not observed\)/);
  assert.equal(trend.source, 'TEMPO FM0030 TL0130 0400 FG BKN002');
  assert.deepEqual(trend.unknown, ['TEMPO', 'FM0030', 'TL0130', '0400', 'FG', 'BKN002']);
  assert.ok(!result.blocks.some(b => b.title === 'TEMPO'));
  assert.equal(result.blocks[2].source, 'RMK TEST ONLY');
  const nosig = explainMetBriefing(observations.nosig);
  assert.match(nosig.blocks[1].lines.join(' '), /no significant change forecast.*not a guarantee/);
});
test('NIL and missing groups never supply weather or infer missing values', () => {
  const nil = explainMetBriefing(observations.nil);
  assert.match(nil.blocks[0].lines.join(' '), /NIL: observation unavailable/);
  assert.doesNotMatch(nil.blocks[0].lines.join(' '), /Calm|visibility:|QNH:/);
  const missing = explainMetBriefing(observations.missing).blocks[0];
  assert.deepEqual(missing.unknown, ['////', 'BKN///', 'Q////']);
  assert.match(missing.lines.join(' '), /Air temperature: not reported; dew point: not reported/);
  assert.match(missing.lines.join(' '), /15 km\/h/);
  assert.doesNotMatch(missing.lines.join(' '), /0 ft|0 hPa|0 °C/);
  assert.match(explainMetBriefing('METAR YZZZ 100400Z').blocks[0].lines.join(' '), /No observation condition groups/);
});
test('multiple observations and a TAF stay separate with same-line, multiline and absent terminators', () => {
  for (const separator of [' ', '\n', '\r\n']) {
    const text = `TAF YZZZ 100300Z 1003/1103 03010KT CAVOK=${separator}${observations.routine}${separator}${observations.special}`;
    const result = explainMetBriefing(text);
    assert.equal(result.original, text);
    const base = result.blocks.find(b => b.title === 'Initial prevailing conditions');
    assert.equal(base.source, '03010KT CAVOK');
    assert.ok(!base.unknown.length);
    assert.equal(result.blocks.filter(b => /· observation$/.test(b.title)).length, 2);
    assert.doesNotMatch(base.lines.join(' '), /28 kt|29.92/);
  }
  const result = explainMetBriefing(observations.routine.replace('=', '') + '\n' + observations.special.replace('=', ''));
  assert.equal(result.blocks.filter(b => /· observation$/.test(b.title)).length, 2);
});
test('bad observation times and headers retain all text without partial decoding', () => {
  for (const text of [
    'METAR YZZZ 000400Z 06018KT', 'SPECI YZZZ 102400Z 06018KT',
    'METAR YZZZ 100460Z 06018KT', 'METAR YZZZ 999999Z 06018KT',
    'SPECI YZZZ 06018KT', 'METAR BAD 100400Z 06018KT',
  ]) {
    const result = explainMetBriefing(text);
    assert.equal(result.original, text);
    assert.equal(result.blocks[0].title, 'Observation not interpreted');
    assert.deepEqual(result.blocks[0].unknown, [text]);
    assert.doesNotMatch(result.blocks[0].lines.join(' '), /18 kt/);
  }
  assert.match(explainMetBriefing('METAR YZZZ 100400Z 99910KT NSW FOO').blocks[0].unknown.join(' '), /99910KT NSW FOO/);
});
test('MET reader never uses a remote request', () => {
  const before = global.fetch;
  global.fetch = () => { throw new Error('Unexpected network'); };
  try {
    for (const text of [sample, ...Object.values(observations)]) assert.ok(explainMetBriefing(text));
  } finally { global.fetch = before; }
  const ui = fs.readFileSync(require.resolve('../components/MetBriefingExplainer.tsx'), 'utf8');
  assert.doesNotMatch(ui, /\bfetch\(|AsyncStorage|api-client|analytics/);
  for (const file of ['met-briefing.ts', 'met-observations.ts']) {
    assert.doesNotMatch(fs.readFileSync(require.resolve(`../lib/${file}`), 'utf8'), /\bfetch\(|https?:|AsyncStorage|api-client|analytics/);
  }
  assert.match(ui, /METAR, SPECI, TAF/);
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
function hourlyTimes(start, count) {
  const first = Date.parse(`${start}:00Z`);
  return Array.from({ length: count }, (_, index) => new Date(first + index * 3600000).toISOString().slice(0, 16));
}
function canonicalForecastTimes(times) {
  return times.map(time => `${time}:00.000Z`);
}
function cacheForHours(times, retrievedAt = `${times[0]}:00.000Z`) {
  const fixture = cache();
  fixture.retrievedAt = retrievedAt;
  fixture.payload.hourly.time = times;
  for (const key of Object.keys(fixture.payload.hourly)) {
    if (key !== 'time') fixture.payload.hourly[key] = Array(times.length).fill(null);
  }
  fixture.payload.hourly.wind_speed_10m = times.map((_, index) => index + 1);
  fixture.payload.hourly.wind_speed_80m = times.map((_, index) => index + 10);
  return fixture;
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
test('weather hour selection changes cleanly across UTC rollover and six-hour window boundaries', () => {
  const times = hourlyTimes('2026-11-10T03', 10);
  const snapshot = W.parseWeatherCache(cacheForHours(times));
  const justBefore = Date.parse('2026-11-10T04:59:59.999Z');
  const justAfter = Date.parse('2026-11-10T05:00:00.001Z');
  assert.deepEqual(W.weatherHoursNow(snapshot, justBefore).map(hour => hour.time), canonicalForecastTimes(times.slice(1, 7)));
  assert.deepEqual(W.weatherHoursNow(snapshot, justAfter).map(hour => hour.time), canonicalForecastTimes(times.slice(2, 8)));
  assert.deepEqual(W.weatherHoursNow(snapshot, Date.parse('2026-11-10T05:00:00.000Z')).map(hour => hour.time), canonicalForecastTimes(times.slice(2, 8)));
  assert.deepEqual(W.weatherHoursNow(snapshot, Date.parse('2026-11-10T10:59:59.999Z')).map(hour => hour.time), canonicalForecastTimes(times.slice(7, 10)));
  assert.deepEqual(W.weatherHoursNow(snapshot, Date.parse('2026-11-10T11:00:00.000Z')).map(hour => hour.time), canonicalForecastTimes(times.slice(8)));
  assert.ok(!W.weatherHoursNow(snapshot, justAfter).some(hour => Date.parse(hour.time) < Date.parse('2026-11-10T05:00:00Z')));
});
test('missing present-hour data never promotes a stale hour over available future hours', () => {
  const times = ['2026-11-10T03:00', '2026-11-10T05:00', '2026-11-10T06:00'];
  const snapshot = W.parseWeatherCache(cacheForHours(times));
  const now = Date.parse('2026-11-10T04:30:00Z');
  const available = W.weatherHoursNow(snapshot, now);
  assert.deepEqual(available.map(hour => hour.time), canonicalForecastTimes(times.slice(1)));
  assert.equal(available.find(hour => Date.parse(hour.time) <= now), undefined);
  assert.ok(!available.some(hour => Date.parse(hour.time) < now));
});
test('weather age warning and future retrieval conflict honor exact clock boundaries', () => {
  const snapshot = W.parseWeatherCache(cacheForHours(
    hourlyTimes('2026-11-10T04', 2), '2026-11-10T04:00:00.000Z',
  ));
  assert.match(W.weatherAge(snapshot, Date.parse('2026-11-10T07:00:00.000Z')), /Retrieved 180 min ago/);
  assert.equal(W.weatherAge(snapshot, Date.parse('2026-11-10T07:00:00.001Z')), 'Saved forecast is over 3 hours old');

  const futureRetrieved = W.parseWeatherCache(cacheForHours(
    hourlyTimes('2026-11-10T10', 2), '2026-11-10T10:00:00.000Z',
  ));
  assert.match(W.weatherAge(futureRetrieved, Date.parse('2026-11-10T09:55:00.000Z')), /Retrieved 0 min ago/);
  assert.equal(W.weatherAge(futureRetrieved, Date.parse('2026-11-10T09:54:59.999Z')),
    'Device clock / retrieval time conflict');
});
test('weather selection crosses UTC midnight without carrying yesterday into current', () => {
  const times = hourlyTimes('2026-11-10T22', 9);
  const snapshot = W.parseWeatherCache(cacheForHours(times));
  const beforeMidnight = Date.parse('2026-11-10T23:59:59.999Z');
  const afterMidnight = Date.parse('2026-11-11T00:00:00.001Z');
  const before = W.weatherHoursNow(snapshot, beforeMidnight);
  const after = W.weatherHoursNow(snapshot, afterMidnight);
  assert.deepEqual(before.map(hour => hour.time), canonicalForecastTimes(times.slice(1, 7)));
  assert.deepEqual(after.map(hour => hour.time), canonicalForecastTimes(times.slice(2, 8)));
  assert.equal(before.find(hour => Date.parse(hour.time) <= beforeMidnight).time, '2026-11-10T23:00:00.000Z');
  assert.equal(after.find(hour => Date.parse(hour.time) <= afterMidnight).time, '2026-11-11T00:00:00.000Z');
  assert.ok(!after.some(hour => hour.time.startsWith('2026-11-10')));
});
test('missing 120 m wind stays unavailable instead of becoming zero or a lower-height value', () => {
  const fixture = cacheForHours(hourlyTimes('2026-11-10T04', 2));
  delete fixture.payload.hourly.wind_speed_120m;
  delete fixture.payload.hourly.wind_direction_120m;
  const snapshot = W.parseWeatherCache(fixture);
  const [hour] = W.weatherHoursNow(snapshot, Date.parse('2026-11-10T04:30:00Z'));
  assert.equal(hour.wind_speed_10m, 1);
  assert.equal(hour.wind_speed_80m, 10);
  assert.equal(hour.wind_speed_120m, null);
  assert.equal(hour.wind_direction_120m, null);
  assert.equal(W.windUnits(hour.wind_speed_120m), 'Not supplied');
  assert.notEqual(hour.wind_speed_120m, 0);
  assert.notEqual(hour.wind_speed_120m, hour.wind_speed_10m);
  assert.notEqual(hour.wind_speed_120m, hour.wind_speed_80m);
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
  assert.doesNotMatch(navigate, /<MetBriefingExplainer/);
  const tools = fs.readFileSync(require.resolve('../app/(tabs)/tools.tsx'), 'utf8');
  assert.match(tools, /<MetBriefingExplainer embedded/);
  assert.match(tools, /<NotamExplainer embedded/);
});
