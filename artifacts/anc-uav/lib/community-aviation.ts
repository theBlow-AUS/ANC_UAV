import { distanceKm, initialBearingDegrees, type Coordinate } from './geo';

export const COMMUNITY_KEY = 'anc-uav.ourairports.v1';
export const COMMUNITY_SOURCE = 'https://ourairports.com/data/';
export const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
export const FREQUENCIES_URL = 'https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv';
export const MAX_AIRPORT_CSV_BYTES = 24_000_000;
export const MAX_FREQUENCY_CSV_BYTES = 4_000_000;
export const MAX_SNAPSHOT_CHARS = 1_900_000;

export type CommunityAirport = {
  id: string; ident: string; name: string; position: Coordinate; sourceType: string; region: string;
};
export type CommunityFrequency = {
  id: string; airportId: string; sourceType: string; description: string; frequencyMHz: string;
};
export type CommunitySnapshot = {
  version: 1; publisher: 'OurAirports'; licence: 'Public domain'; retrievedAt: string;
  revision: string; airports: CommunityAirport[]; frequencies: CommunityFrequency[];
  rejectedAirports: number; rejectedFrequencies: number;
};
export type FrequencyGroup = 'ctaf' | 'conditional' | 'other';
export type CommunityResult = {
  airport: CommunityAirport; frequency: CommunityFrequency; group: FrequencyGroup;
  distanceKm: number | null; bearingDegrees: number | null;
};

/** CSV only, no HTML/JS execution. Handles escaped quotes, CRLF and quoted newlines. */
export function parseCsv(input: string, required: string[], maxRows = 160000): Record<string, string>[] {
  if (input.length > MAX_AIRPORT_CSV_BYTES || !input.trim()) throw new Error('CSV is empty or oversized.');
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false, closedQuote = false;
  const text = input.replace(/^\uFEFF/, '');
  const cell = () => { row.push(value); value = ''; closedQuote = false; };
  const line = () => {
    cell();
    if (row.some(v => v !== '')) rows.push(row);
    row = [];
    if (rows.length > maxRows + 1) throw new Error('CSV row limit exceeded.');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else value += c;
    } else if (c === ',') cell();
    else if (c === '\n' || c === '\r') { line(); if (c === '\r' && text[i + 1] === '\n') i++; }
    else if (c === '"' && !value && !closedQuote) quoted = true;
    else {
      if (closedQuote || c === '"') throw new Error('Malformed CSV quoting.');
      value += c;
    }
    if (value.length > 20000 || row.length > 80) throw new Error('CSV field limit exceeded.');
  }
  if (quoted) throw new Error('CSV is truncated inside a quoted field.');
  if (value || row.length || closedQuote) line();
  const headers = rows.shift();
  if (!headers || new Set(headers).size !== headers.length || required.some(k => !headers.includes(k)))
    throw new Error('Unexpected CSV headers. No dataset was replaced.');
  return rows.map(r => {
    if (r.length !== headers.length) throw new Error('CSV has a truncated or malformed row.');
    return Object.fromEntries(headers.map((k, i) => [k, r[i]]));
  });
}

function numeric(raw: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function validCoordinate(p: Coordinate): boolean {
  return Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}
export function classifyFrequency(f: CommunityFrequency): FrequencyGroup {
  const type = f.sourceType.trim().toUpperCase();
  const description = f.description.toUpperCase();
  // A community fire/incident reference must never become a location-assigned FCTAF.
  if (/\bFCTAF\b|\bFIRE\b/.test(`${type} ${description}`)) return 'other';
  if (/\bCTAF\b/.test(`${type} ${description}`) &&
    (Number(f.frequencyMHz) < 118 || Number(f.frequencyMHz) > 136.975)) return 'conditional';
  if (type === 'CTAF' && !/\b(TWR|TOWER|HOURS?|HRS|WHEN|AFTER|OUTSIDE|EXCEPT|CONDITIONAL|PART.TIME)\b/.test(description))
    return 'ctaf';
  if (/\bCTAF\b/.test(`${type} ${description}`)) return 'conditional';
  return 'other';
}

export function buildCommunitySnapshot(airportCsv: string, frequencyCsv: string, retrievedAt: string, revision: string): CommunitySnapshot {
  const rawAirports = parseCsv(airportCsv, ['id', 'ident', 'type', 'name', 'latitude_deg', 'longitude_deg', 'iso_country', 'iso_region']);
  const rawFrequencies = parseCsv(frequencyCsv, ['id', 'airport_ref', 'airport_ident', 'type', 'description', 'frequency_mhz']);
  const airports: CommunityAirport[] = [], frequencies: CommunityFrequency[] = [];
  const allAuIds = new Set<string>(), ids = new Set<string>(), freqIds = new Set<string>();
  let rejectedAirports = 0, rejectedFrequencies = 0;
  for (const r of rawAirports) {
    if (r.iso_country !== 'AU') continue;
    allAuIds.add(r.id);
    const lat = numeric(r.latitude_deg), lon = numeric(r.longitude_deg);
    if (!r.id || !r.ident.trim() || !r.name.trim() || lat === null || lon === null ||
      !validCoordinate({ latitude: lat, longitude: lon }) || ids.has(r.id) ||
      r.name.length > 300 || r.ident.length > 40 || r.type.length > 80 || r.iso_region.length > 40) {
      rejectedAirports++; continue;
    }
    ids.add(r.id);
    airports.push({ id: r.id, ident: r.ident, name: r.name, sourceType: r.type || 'unknown', region: r.iso_region,
      position: { latitude: lat, longitude: lon } });
  }
  const airportById = new Map(airports.map(a => [a.id, a]));
  for (const r of rawFrequencies) {
    if (!allAuIds.has(r.airport_ref)) continue;
    const airport = airportById.get(r.airport_ref);
    const mhz = numeric(r.frequency_mhz);
    if (!airport || airport.ident !== r.airport_ident || !r.id || freqIds.has(r.id) ||
      mhz === null || mhz <= 0 || mhz > 1000 || r.type.length > 100 || r.description.length > 1500) {
      rejectedFrequencies++; continue;
    }
    freqIds.add(r.id);
    frequencies.push({ id: r.id, airportId: r.airport_ref, sourceType: r.type || 'unspecified',
      description: r.description, frequencyMHz: r.frequency_mhz.trim() });
  }
  return validateCommunitySnapshot({ version: 1, publisher: 'OurAirports', licence: 'Public domain', retrievedAt, revision,
    airports, frequencies, rejectedAirports, rejectedFrequencies });
}

/** Validate cached and downloaded snapshots, not just JSON shape. */
export function validateCommunitySnapshot(raw: unknown): CommunitySnapshot {
  const s = raw as CommunitySnapshot;
  if (!s || s.version !== 1 || s.publisher !== 'OurAirports' || s.licence !== 'Public domain' ||
    typeof s.retrievedAt !== 'string' || !/^\d{4}-\d\d-\d\dT.*Z$/.test(s.retrievedAt) || !Number.isFinite(Date.parse(s.retrievedAt)) ||
    typeof s.revision !== 'string' || !s.revision || s.revision.length > 150 ||
    !Array.isArray(s.airports) || !s.airports.length || s.airports.length > 15000 ||
    !Array.isArray(s.frequencies) || !s.frequencies.length || s.frequencies.length > 30000 ||
    !Number.isInteger(s.rejectedAirports) || s.rejectedAirports < 0 ||
    !Number.isInteger(s.rejectedFrequencies) || s.rejectedFrequencies < 0)
    throw new Error('Invalid community aviation snapshot.');
  const boundedText = (v: unknown, n: number, empty = false) => typeof v === 'string' && v.length <= n && (empty || !!v.trim());
  const ids = new Set<string>();
  for (const a of s.airports) {
    if (!a || !boundedText(a.id, 40) || ids.has(a.id) || !boundedText(a.ident, 40) ||
      !boundedText(a.name, 300) || !boundedText(a.sourceType, 80) || !boundedText(a.region, 40, true) ||
      !a.position || !validCoordinate(a.position)) throw new Error('Invalid saved aerodrome.');
    ids.add(a.id);
  }
  const fids = new Set<string>();
  for (const f of s.frequencies) {
    if (!f || !boundedText(f.id, 40) || fids.has(f.id) || !ids.has(f.airportId) ||
      !boundedText(f.sourceType, 100) || !boundedText(f.description, 1500, true) ||
      typeof f.frequencyMHz !== 'string' || f.frequencyMHz.length > 20 ||
      numeric(f.frequencyMHz) === null || Number(f.frequencyMHz) <= 0 || Number(f.frequencyMHz) > 1000)
      throw new Error('Invalid saved frequency.');
    fids.add(f.id);
  }
  if (JSON.stringify(s).length > MAX_SNAPSHOT_CHARS) throw new Error('Community snapshot exceeds storage limit.');
  return s;
}

/** No invented applicability. Radius is a user search filter, not a radio-service radius. */
export function searchCommunity(snapshot: CommunitySnapshot, options: {
  origin: Coordinate | null; search: string; radiusKm: number | null; group: FrequencyGroup | 'all';
}): CommunityResult[] {
  const { origin, radiusKm, group } = options;
  if (origin && !validCoordinate(origin)) throw new Error('Invalid origin.');
  if (radiusKm !== null && (!Number.isFinite(radiusKm) || radiusKm <= 0)) throw new Error('Invalid search distance.');
  const text = options.search.trim().toLowerCase();
  const airports = new Map<string, { airport: CommunityAirport; distanceKm: number | null; bearingDegrees: number | null }>();
  for (const airport of snapshot.airports) {
    if (text && !`${airport.ident} ${airport.name}`.toLowerCase().includes(text)) continue;
    const d = origin ? distanceKm(origin, airport.position) : null;
    if (d !== null && radiusKm !== null && d > radiusKm) continue;
    airports.set(airport.id, { airport, distanceKm: d, bearingDegrees: origin && d !== null && d > 0.001 ? initialBearingDegrees(origin, airport.position) : null });
  }
  return snapshot.frequencies.flatMap(frequency => {
    const a = airports.get(frequency.airportId);
    const kind = classifyFrequency(frequency);
    return a && (group === 'all' || group === kind) ? [{ ...a, frequency, group: kind }] : [];
  }).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
    a.airport.name.localeCompare(b.airport.name) || a.frequency.id.localeCompare(b.frequency.id));
}

/** Bounded pages are explicit and fully traversable, never silent truncation. */
export function communityPage<T>(rows: T[], requestedPage: number, size = 10) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(0, Math.min(pages - 1, Math.floor(requestedPage) || 0));
  return { items: rows.slice(page * size, (page + 1) * size), page, pages, total: rows.length };
}
