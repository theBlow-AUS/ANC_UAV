import type { MetBlock } from './met-briefing';

/** Deliberately bounded local subset. Unknown groups are never discarded. */
function observationToken(token: string, common: (token: string) => string | null): string | null {
  const temperature = token.match(/^(M?\d{2}|\/\/)\/(M?\d{2}|\/\/)$/);
  if (temperature) {
    const degrees = (value: string) => value === '//' ? 'not reported' : `${value.replace(/^M/, '−')} °C`;
    return `Air temperature: ${degrees(temperature[1])}; dew point: ${degrees(temperature[2])}.`;
  }
  const pressure = token.match(/^(Q|A)(\d{4})$/);
  if (pressure) return pressure[1] === 'Q'
    ? `QNH: ${Number(pressure[2])} hPa.`
    : `Altimeter setting: ${(Number(pressure[2]) / 100).toFixed(2)} inHg (source A group).`;
  const variation = token.match(/^(\d{3})V(\d{3})$/);
  if (variation && Number(variation[1]) <= 360 && Number(variation[2]) <= 360) {
    return `Reported wind direction varying between ${Number(variation[1])}° and ${Number(variation[2])}° true; not a forecast or a vertical wind profile.`;
  }
  if (token === 'VV///') return 'Sky obscured; vertical visibility not available (VV///).';
  if (token === 'NSW') return null; // A trend code, not an observed absence of weather.
  if (token === '9999') return 'Reported prevailing horizontal visibility: 10 km or more.';
  return common(token);
}

export function observationBlocks(
  source: string,
  time: (value: string, minutes: boolean) => string | null,
  common: (token: string) => string | null,
): MetBlock[] {
  const header = source.match(/^(METAR|SPECI)\s+(?:(COR)\s+)?([A-Z]{4})\s+(\d{6})Z(?:\s+([\s\S]*))?$/);
  if (!header || !time(header[4], true)) {
    return [{
      title: 'Observation not interpreted', source,
      lines: ['Unsupported or malformed METAR/SPECI header or observation time. No conditions decoded; review the original.'],
      unknown: [source],
    }];
  }
  const [, type, correction, station, stamp, body = ''] = header;
  const tokens = body.split(/\s+/).filter(Boolean);
  const lines = [
    `${type === 'SPECI' ? 'Special' : 'Routine'} observation for station ${station}, observed on ${time(stamp, true)} (${stamp}Z). This is not a forecast.`,
    'Station scope only: no location lookup, GPS applicability, currency check or month/year inference. Cloud heights are above the aerodrome, not your current ground.',
  ];
  if (correction) lines.push('COR: corrected report; this does not establish that it is the latest observation.');
  while (tokens[0] === 'AUTO' || tokens[0] === 'COR') {
    const qualifier = tokens.shift();
    lines.push(qualifier === 'AUTO'
      ? 'AUTO: automated observation; this does not imply human verification or complete detection of all weather.'
      : 'COR: corrected report; this does not establish that it is the latest observation.');
  }
  const blocks: MetBlock[] = [];
  const unknown: string[] = [];
  const splitAt = tokens.findIndex(token => /^(RMK|NOSIG|BECMG|TEMPO|INTER|FM\d{4,6}|PROB\d{2})$/.test(token));
  const observed = splitAt < 0 ? tokens : tokens.slice(0, splitAt);
  if (observed.includes('NIL')) {
    lines.push('NIL: observation unavailable. No weather conditions can be inferred.');
    unknown.push(...observed.filter(token => token !== 'NIL'));
  } else {
    if (!observed.length) lines.push('No observation condition groups supplied; missing conditions are not filled in.');
    for (const token of observed) {
      const decoded = observationToken(token, common);
      if (decoded) lines.push(decoded);
      else unknown.push(token);
    }
  }
  blocks.push({ title: `${type} · ${station} · observation`, source, lines, unknown });
  if (splitAt >= 0) {
    const tail = tokens.slice(splitAt);
    const remarksAt = tail.indexOf('RMK');
    const trend = remarksAt < 0 ? tail : tail.slice(0, remarksAt);
    if (trend.length) blocks.push({
      title: `${type} · ${station} · trend forecast (not observed)`, source: trend.join(' '),
      lines: trend.length === 1 && trend[0] === 'NOSIG'
        ? ['NOSIG: no significant change forecast over the trend period; not a guarantee of unchanged conditions or safe flight. No absolute validity dates are inferred.']
        : ['Trend forecast retained as written, not decoded or merged with observed conditions. Trend times and qualifiers remain in the source.'],
      unknown: trend.length === 1 && trend[0] === 'NOSIG' ? [] : trend,
    });
    if (remarksAt >= 0) {
      const remarks = tail.slice(remarksAt);
      blocks.push({
        title: `${type} · ${station} · remarks (RMK)`, source: remarks.join(' '),
        lines: ['Remarks retained as written; numeric, recent-weather and other remark groups are not interpreted as current conditions.'],
        unknown: remarks,
      });
    }
  }
  return blocks;
}
