export type MetBlock = { title: string; source: string; lines: string[]; unknown: string[] };
export type MetReading = { original: string; blocks: MetBlock[]; warnings: string[] };

const weather: Record<string, string> = {
  TSRA: 'Thunderstorms with moderate rain', '+TSRA': 'Thunderstorms with heavy rain',
  '-TSRA': 'Thunderstorms with light rain', VCTS: 'Thunderstorms in the vicinity', TS: 'Thunderstorm',
  RA: 'Moderate rain', '-RA': 'Light rain', '+RA': 'Heavy rain',
  SHRA: 'Moderate rain showers', '-SHRA': 'Light rain showers', '+SHRA': 'Heavy rain showers',
  DZ: 'Moderate drizzle', '-DZ': 'Light drizzle', '+DZ': 'Heavy drizzle',
  FG: 'Fog', BR: 'Mist', HZ: 'Haze', FU: 'Smoke', DU: 'Dust', SN: 'Snow',
  NSW: 'No significant weather reported in this group', NSC: 'No significant cloud reported in this group',
};
const cloudAmounts: Record<string, string> = {
  FEW: 'Few (1–2 oktas)', SCT: 'Scattered (3–4 oktas)', BKN: 'Broken (5–7 oktas)', OVC: 'Overcast (8 oktas)',
};

function dayTime(value: string, minutes = false): string | null {
  if (!new RegExp(minutes ? '^\\d{6}$' : '^\\d{4}$').test(value)) return null;
  const day = Number(value.slice(0, 2)), hour = Number(value.slice(2, 4));
  const minute = minutes ? Number(value.slice(4, 6)) : 0;
  if (day < 1 || day > 31 || hour > (minutes ? 23 : 24) || minute > 59) return null;
  return `day ${day}, ${value.slice(2, 4)}:${minutes ? value.slice(4, 6) : '00'} UTC${hour === 24 ? ' (end of that day)' : ''}`;
}

function interval(value: string): string | null {
  const pair = value.split('/');
  if (pair.length !== 2) return null;
  const from = dayTime(pair[0]), to = dayTime(pair[1]);
  return from && to ? `${from} to ${to}` : null;
}

function decodeToken(token: string): string | null {
  const wind = token.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/);
  if (wind) {
    if (wind[1] !== 'VRB' && Number(wind[1]) > 360) return null;
    const factor = wind[4] === 'KT' ? 0.514444 : wind[4] === 'KMH' ? 1 / 3.6 : 1;
    const speed = Number(wind[2]), gust = wind[3] ? Number(wind[3]) : null;
    const unit = wind[4] === 'KT' ? 'kt' : wind[4] === 'MPS' ? 'm/s' : 'km/h';
    const calm = wind[1] === '000' && speed === 0 && gust === null;
    return calm ? 'Calm wind reported in this group.' :
      `Wind from ${wind[1] === 'VRB' ? 'a variable direction' : `${Number(wind[1])}° true`} at ${speed} ${unit} (${(speed * factor).toFixed(1)} m/s)` +
      (gust === null ? '.' : `, gusting ${gust} ${unit} (${(gust * factor).toFixed(1)} m/s).`);
  }
  if (token === '9999') return 'Horizontal visibility: 10 km or more.';
  if (/^\d{4}$/.test(token)) return token === '0000' ? 'Visibility: less than 50 m.' : `Horizontal visibility: ${Number(token)} m.`;
  if (token === 'CAVOK') return 'CAVOK: visibility at least 10 km; no cloud below 5,000 ft or the highest 25 NM minimum sector altitude (whichever is higher), no cumulonimbus, and no significant weather under CAVOK criteria. It does not mean clear sky or safe UAV conditions.';
  if (weather[token]) return `${weather[token]}.`;
  const cloud = token.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/);
  if (cloud) return `${cloudAmounts[cloud[1]]} cloud, base ${Number(cloud[2]) * 100} ft above the aerodrome${cloud[3] === 'CB' ? '; cumulonimbus (thunderstorm cloud)' : cloud[3] === 'TCU' ? '; towering cumulus' : ''}. This is not height above your current ground position.`;
  const vv = token.match(/^VV(\d{3})$/);
  if (vv) return `Vertical visibility: ${Number(vv[1]) * 100} ft above the aerodrome.`;
  return null;
}

function conditionBlock(source: string, base: boolean): MetBlock {
  let rest = source.trim();
  let title = base ? 'Initial prevailing conditions' : 'Change group';
  const lines: string[] = [];
  const unknown: string[] = [];
  const fm = rest.match(/^FM(\d{6})\b/);
  const change = rest.match(/^(PROB(?:30|40)(?:\s+(?:INTER|TEMPO))?|INTER|TEMPO|BECMG)\b/);
  if (fm) {
    title = 'New prevailing conditions (FM)';
    lines.push(dayTime(fm[1], true) ? `From ${dayTime(fm[1], true)}.` : 'From-time not interpreted.');
    rest = rest.slice(fm[0].length).trim();
  } else if (change) {
    const marker = change[0];
    title = marker;
    if (marker.startsWith('PROB')) lines.push(`${marker.slice(4, 6)}% probability of the following variation, not a probability for your GPS position or the whole briefing.`);
    if (marker.includes('INTER')) lines.push('Intermittent variations, each lasting less than 30 minutes (Australian TAF convention).');
    if (marker.includes('TEMPO')) lines.push('Temporary variations, each lasting at least 30 but less than 60 minutes (Australian TAF convention).');
    if (marker === 'BECMG') lines.push('A transition to new prevailing conditions during the stated interval.');
    rest = rest.slice(marker.length).trim();
    const time = rest.split(/\s+/)[0];
    if (interval(time)) { lines.push(`During ${interval(time)}.`); rest = rest.slice(time.length).trim(); }
    else unknown.push('Change interval missing or not interpreted');
  }
  for (const token of rest.split(/\s+/).filter(Boolean)) {
    const decoded = decodeToken(token);
    if (decoded) lines.push(decoded);
    else unknown.push(token);
  }
  return { title, source, lines, unknown };
}

/** Local reading aid; never fetches a briefing or determines operational applicability. */
export function explainMetBriefing(input: string): MetReading {
  if (!input.trim()) throw new Error('Paste a MET briefing or TAF first.');
  if (input.length > 30_000) throw new Error('Use one briefing of at most 30,000 characters.');
  const allLines = input.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim());
  const starts = allLines.map((line, i) => /^TAF\s+(?:(?:AMD|COR)\s+)?[A-Z]{4}\b/.test(line) ? i : -1).filter(i => i >= 0);
  if (starts.length > 1) throw new Error('Use one TAF at a time so its change groups cannot be mixed with another forecast.');
  const warnings = [
    'Reading aid only. This does not verify the latest issue, dates, applicability, or completeness. Check current official aviation weather.',
    'TAF winds describe aerodrome surface forecasts, not a wind profile to 120 m at your location. Cloud bases are above aerodrome elevation.',
    'Day/time groups stay in UTC; month, year and local timezone are not inferred. Change and probability groups are kept separate; missing elements are not filled in.',
  ];
  const blocks: MetBlock[] = [];
  if (/MAY NOT BE THE LATEST/i.test(input)) warnings.push('The source explicitly says its TAF may not be the latest issue.');
  if (/NOT AMENDED BETWEEN ROUTINE ISSUES/i.test(input)) warnings.push('The source says this briefing is not amended between routine issues.');
  const issueLine = allLines.find(line => /^ISSUED AT\b/i.test(line));
  if (issueLine) blocks.push({ title: 'Briefing issue statement (as supplied)', source: issueLine, lines: ['This wrapper issue statement is separate from the TAF issue time.'], unknown: [] });
  if (starts.length) {
    let end = starts[0] + 1;
    while (end < allLines.length && allLines[end] && !/^[A-Z][A-Z /()-]+:\s*/.test(allLines[end])) end++;
    const taf = allLines.slice(starts[0], end).join(' ').replace(/=$/, '').trim();
    const header = taf.match(/^TAF\s+(?:(AMD|COR)\s+)?([A-Z]{4})\s+(\d{6})Z\s+(\d{4}\/\d{4})\s*(.*)$/);
    if (header) {
      blocks.push({
        title: `TAF · ${header[2]}${header[1] ? ` · ${header[1] === 'AMD' ? 'amended' : 'corrected'}` : ''}`,
        source: `TAF ${header[1] ? `${header[1]} ` : ''}${header[2]} ${header[3]}Z ${header[4]}`,
        lines: [
          dayTime(header[3], true) ? `TAF issued on ${dayTime(header[3], true)}.` : 'Issue time not interpreted.',
          interval(header[4]) ? `Forecast period: ${interval(header[4])}.` : 'Validity period not interpreted.',
          'Station identifier is retained; no location lookup or currency check is performed.',
        ], unknown: [],
      });
      const remarkAt = header[5].search(/\bRMK\b/);
      const conditions = remarkAt >= 0 ? header[5].slice(0, remarkAt).trim() : header[5];
      const markers = [...conditions.matchAll(/\b(?:FM\d{6}|PROB(?:30|40)(?:\s+(?:INTER|TEMPO))?|INTER|TEMPO|BECMG)\b/g)].map(m => m.index!);
      const cuts = [...new Set([0, ...markers, conditions.length])];
      for (let i = 0; i < cuts.length - 1; i++) {
        const group = conditions.slice(cuts[i], cuts[i + 1]).trim();
        if (group) blocks.push(conditionBlock(group, cuts[i] === 0 && !markers.includes(0)));
      }
      if (remarkAt >= 0) {
        const remarks = header[5].slice(remarkAt + 3).trim();
        const tq = remarks.match(/^T\s+((?:M?\d{1,2}\s+){3}M?\d{1,2})\s+Q\s+((?:\d{4}\s+){3}\d{4})$/);
        blocks.push({
          title: 'TAF remarks (RMK)', source: remarks,
          lines: tq ? [
            `Temperature series: ${tq[1].split(/\s+/).map(n => n.replace(/^M/, '−')).join(', ')} °C.`,
            `QNH series: ${tq[2].split(/\s+/).join(', ')} hPa.`,
            'In Australian TAFs these series are at validity commencement, then +3, +6 and +9 hours; no local times are inferred.',
          ] : ['Remarks retained as written; turbulence, TAF3 and other remark codes are not decoded.'],
          unknown: tq ? [] : [remarks || 'No remark content'],
        });
      }
    } else warnings.push('TAF header not supported or malformed; no forecast groups were interpreted.');
  } else warnings.push('No supported TAF header found. Narrative and the complete original remain available.');

  let narrative: MetBlock | null = null;
  for (const line of allLines) {
    if (/^(TAF SUMMARY|THUNDERSTORM POTENTIAL.*|OTHER POSSIBILITIES|[A-Z ]+ OUTLOOK|NOTES)\s*:/.test(line)) {
      narrative = { title: line.replace(/:\s*$/, ''), source: '', lines: ['Source narrative retained verbatim. Regional/TMA probabilities are not combined with the aerodrome TAF or your GPS forecast.'], unknown: [] };
      blocks.push(narrative);
      const afterColon = line.slice(line.indexOf(':') + 1).trim();
      if (afterColon) narrative.source = afterColon;
    } else if (/^REGARDS:|^AVIATION FORECASTER/.test(line)) narrative = null;
    else if (narrative && line) narrative.source += `${narrative.source ? '\n' : ''}${line}`;
  }
  if (blocks.some(block => block.unknown.length)) warnings.push('Some tokens remain uninterpreted. They are listed with their source group; review the original before relying on any reading.');
  return { original: input, blocks, warnings };
}
