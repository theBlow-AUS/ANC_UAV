import { z } from 'zod';
import type { Coordinate } from './geo';
import { distanceKm } from './geo';
import { insideRing } from './navigation';
import type { NavigationPack, Provenance } from '../data/navigation-pack';

export const OPENAIP_LEGAL = 'https://www.openaip.net/legal';
export const OPENAIP_EXPORTS = 'https://storage.openaip.net/openaip-system-exports/';
export const OPENAIP_PACK_ID = 'openaip-au-downloaded';
export const OPENAIP_NOTICE = 'OpenAIP contributors · CC BY-NC 4.0 and published app-use conditions. Uncertified, partial reference; not for primary navigation or flight planning. Verify frequencies in official documents. No results does not mean clear airspace.';
const id = z.string().regex(/^[a-f0-9]{24}$/);
const text = z.string().max(2000);
const point = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const ring = z.array(point).min(4).max(20000).refine(r =>
  r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1], 'Unclosed source ring');
const polygon = z.array(ring).min(1).max(100);
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1).max(100) }),
]);
const limit = z.object({ value: z.number().finite(), unit: z.number().int(), referenceDatum: z.number().int() });
const frequency = z.object({
  value: z.string().max(40), unit: z.number().int(), name: text,
  type: z.number().int().nullable(), remarks: text,
});
const base = {
  id, name: z.string().min(1).max(500), updatedAt: z.string().datetime({ offset: true }).nullable(),
  frequencies: z.array(frequency).max(100), notes: z.array(text).max(50),
};
const airport = z.object({
  ...base, kind: z.literal('airport'), icao: z.string().max(20).nullable(),
  position: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  elevation: limit.nullable(), sourceType: z.number().int().nullable(),
});
const airspace = z.object({
  ...base, kind: z.literal('airspace'), geometry, lowerLimit: limit.nullable(), upperLimit: limit.nullable(),
  icaoClass: z.number().int().nullable(), sourceType: z.number().int().nullable(),
  schedule: z.string().max(20000), h24: z.boolean(), conditions: z.array(text).max(20),
});
export const recordSchema = z.discriminatedUnion('kind', [airport, airspace]);
const file = z.object({
  key: z.enum(['au_apt.json', 'au_asp.json']), bytes: z.number().int().positive().max(16 * 1024 * 1024),
  etag: z.string().min(1).max(150), modifiedAt: z.string().datetime({ offset: true }),
});
export const snapshotSchema = z.object({
  format: z.literal('anc-openaip-v1'), retrievedAt: z.string().datetime({ offset: true }),
  licence: z.literal('CC BY-NC 4.0').default('CC BY-NC 4.0'),
  rightsReference: z.literal(OPENAIP_LEGAL).default(OPENAIP_LEGAL),
  attribution: z.literal(OPENAIP_NOTICE).default(OPENAIP_NOTICE),
  sources: z.tuple([file, file]).refine(f => f[0].key === 'au_apt.json' && f[1].key === 'au_asp.json'),
  airports: z.array(airport).min(1).max(20000),
  airspaces: z.array(airspace).min(1).max(20000),
}).superRefine((s, ctx) => {
  for (const records of [s.airports, s.airspaces]) {
    if (new Set(records.map(r => r.id)).size !== records.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate source identifiers' });
  }
});
export type OpenAipRecord = z.infer<typeof recordSchema>;
export type OpenAipAirspace = z.infer<typeof airspace>;
export type OpenAipSnapshot = z.infer<typeof snapshotSchema>;
export type OpenAipSource = z.infer<typeof file>;
export type OpenAipInventory = [OpenAipSource, OpenAipSource];
export type OpenAipSelection = { kind: OpenAipRecord['kind']; id: string };
export const detailSchema = z.object({
  record: recordSchema, retrievedAt: z.string().datetime({ offset: true }),
});
export type OpenAipDetail = z.infer<typeof detailSchema>;
export const detailsSchema = z.array(detailSchema).max(25);

function sourceObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unsupported source record');
  return value as Record<string, any>;
}
function suppliedText(v: unknown, max = 2000) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string' || v.length > max) throw new Error('Unsupported source text');
  return v;
}
function dateOrNull(v: unknown) {
  if (v === undefined || v === null) return null;
  return z.string().datetime({ offset: true }).parse(v);
}
function exactH24(value: unknown): boolean {
  const h = value as { operatingHours?: any[]; remarks?: string } | undefined;
  return !!h && !h.remarks && Array.isArray(h.operatingHours) && h.operatingHours.length === 7 &&
    new Set(h.operatingHours.map(d => d.dayOfWeek)).size === 7 &&
    h.operatingHours.every(d => Number.isInteger(d.dayOfWeek) && d.dayOfWeek >= 0 && d.dayOfWeek <= 6 &&
      d.startTime === '00:00' && d.endTime === '00:00' &&
      ['byNotam', 'sunrise', 'sunset', 'publicHolidaysExcluded'].every(k => d[k] === false) &&
      !d.remarks && Object.keys(d).every(k =>
        ['dayOfWeek', 'startTime', 'endTime', 'byNotam', 'sunrise', 'sunset', 'publicHolidaysExcluded', 'remarks'].includes(k))) &&
    Object.keys(h).every(k => ['operatingHours', 'remarks'].includes(k));
}

/** Keep geometry independent of frequencies. Unknown vertical units remain labelled source codes. */
export function normalizeOpenAipRecord(value: unknown, kind: OpenAipRecord['kind']): OpenAipRecord {
  const r = sourceObject(value);
  if (r.country !== 'AU') throw new Error('The export contains a non-Australian record');
  if (r.frequencies !== undefined && !Array.isArray(r.frequencies)) throw new Error('Invalid frequencies');
  const frequencies = (r.frequencies ?? []).map((v: unknown) => {
    const f = sourceObject(v);
    return frequency.parse({
      value: f.value, unit: f.unit, name: suppliedText(f.name),
      type: f.type ?? null, remarks: suppliedText(f.remarks),
    });
  });
  const notes: string[] = [];
  if (r.remarks) notes.push(suppliedText(r.remarks));
  const common = {
    id: r._id, name: r.name, frequencies, updatedAt: dateOrNull(r.updatedAt), notes,
    sourceType: r.type ?? null,
  };
  if (kind === 'airport') {
    if (r.geometry?.type !== 'Point') throw new Error('Unsupported airport geometry');
    const p = point.parse(r.geometry.coordinates);
    for (const key of ['private', 'ppr', 'skydiveActivity', 'winchOnly']) {
      if (r[key] === true) notes.push(`Source flag: ${key}`);
    }
    return airport.parse({
      ...common, kind, icao: r.icaoCode ?? null, elevation: r.elevation ?? null,
      position: { longitude: p[0], latitude: p[1] },
    });
  }
  const flags = ['onDemand', 'onRequest', 'byNotam', 'specialAgreement', 'requestCompliance'];
  const conditions = flags.filter(k => r[k] === true).map(k => `Source condition: ${k}`);
  for (const k of flags) if (r[k] !== true && r[k] !== false) conditions.push(`Source condition unknown: ${k}`);
  return airspace.parse({
    ...common, kind, geometry: r.geometry, lowerLimit: r.lowerLimit ?? null, upperLimit: r.upperLimit ?? null,
    icaoClass: r.icaoClass ?? null,
    schedule: r.hoursOfOperation === undefined ? 'Not supplied' : JSON.stringify(r.hoursOfOperation),
    h24: exactH24(r.hoursOfOperation), conditions,
  });
}
export function parseOpenAipSnapshot(value: unknown): OpenAipSnapshot {
  const result = snapshotSchema.safeParse(value);
  if (!result.success) throw new Error('OpenAIP snapshot has unsupported or damaged data. Previous data has not been replaced.');
  return result.data;
}
export function buildOpenAipSnapshot(airports: unknown, airspaces: unknown, sources: OpenAipInventory, retrievedAt: string): OpenAipSnapshot {
  if (!Array.isArray(airports) || !Array.isArray(airspaces)) throw new Error('Expected complete JSON export arrays');
  if (airports.length > 20000 || airspaces.length > 20000) throw new Error('Source record limit exceeded');
  return parseOpenAipSnapshot({
    format: 'anc-openaip-v1', retrievedAt, sources,
    airports: airports.map(r => normalizeOpenAipRecord(r, 'airport')),
    airspaces: airspaces.map(r => normalizeOpenAipRecord(r, 'airspace')),
  });
}
export function limitLabel(l: z.infer<typeof limit> | null): string {
  if (!l) return 'Not supplied';
  const unit = ({ 0: 'm', 1: 'ft', 6: 'FL' } as Record<number, string>)[l.unit] ?? `unit ${l.unit}`;
  const datum = ({ 0: 'GND/AGL', 1: 'MSL', 2: 'STD' } as Record<number, string>)[l.referenceDatum] ?? `datum ${l.referenceDatum}`;
  return `${l.value} ${unit} · ${datum}`;
}
export function frequencyLabel(f: OpenAipRecord['frequencies'][number]): string {
  return `${f.value} ${f.unit === 2 ? 'MHz' : `source unit ${f.unit}`} · ${f.name || 'Unnamed service'}${f.type === null ? '' : ` · source type ${f.type}`}${f.remarks ? ` · ${f.remarks}` : ''}`;
}
export function recordGeometry(r: OpenAipRecord) {
  return r.kind === 'airport'
    ? { type: 'Point' as const, coordinates: [r.position.longitude, r.position.latitude] }
    : r.geometry;
}
export function polygons(r: OpenAipAirspace) {
  return r.geometry.type === 'Polygon' ? [r.geometry.coordinates] : r.geometry.coordinates;
}
export function airspaceContains(r: OpenAipAirspace, p: Coordinate) {
  return polygons(r).some(poly => {
    // Do not misread antimeridian-spanning polygons in the flat reference projection.
    if (poly.some(ring => ring.some((q, i) => Math.abs(q[0] - ring[(i + 1) % ring.length][0]) > 180))) return false;
    const contains = (ring: number[][]) => insideRing(p, ring.map(q => ({ longitude: q[0], latitude: q[1] })));
    return contains(poly[0]) && !poly.slice(1).some(contains);
  });
}
export function referencesAt(s: OpenAipSnapshot, p: Coordinate): OpenAipRecord[] {
  // Airport ordering is proximity only, never an invented frequency service area.
  const airports = s.airports.map(r => ({ r, km: distanceKm(r.position, p) })).sort((a, b) => a.km - b.km).slice(0, 3);
  return [...airports.map(v => v.r), ...s.airspaces.filter(r => airspaceContains(r, p))];
}
export function provenance(s: OpenAipSnapshot, kind: OpenAipRecord['kind']): Provenance {
  const f = s.sources[kind === 'airport' ? 0 : 1];
  return {
    publisher: 'OpenAIP contributors', source: `${OPENAIP_EXPORTS}${f.key}`, edition: `Export ${f.modifiedAt}`,
    effectiveFrom: null, effectiveTo: null, retrievedAt: s.retrievedAt, licence: 'CC BY-NC 4.0',
    rightsReference: OPENAIP_LEGAL, attribution: OPENAIP_NOTICE,
  };
}
function navLimit(l: z.infer<typeof limit> | null) {
  if (!l) return null;
  if (l.referenceDatum === 2 && l.unit === 6 && l.value >= -2000 && l.value <= 100000) return { reference: 'FL' as const, value: l.value };
  const value = l.unit === 0 ? l.value / 0.3048 : l.value;
  if ((l.referenceDatum === 0 || l.referenceDatum === 1) && (l.unit === 0 || l.unit === 1) && value >= -2000 && value <= 100000)
    return { reference: l.referenceDatum === 0 ? 'AGL' as const : 'AMSL' as const, value };
  return null;
}
/** Only supported, explicitly linked area frequencies enter the existing applicability engine. */
export function openAipNavigationPack(s: OpenAipSnapshot): NavigationPack {
  const aspSource = provenance(s, 'airspace'), aptSource = provenance(s, 'airport');
  const frequencies: NavigationPack['frequencies'] = [];
  let excluded = 0;
  for (const a of s.airspaces) {
    const lower = navLimit(a.lowerLimit), upper = navLimit(a.upperLimit);
    const poly = a.geometry.type === 'Polygon' && a.geometry.coordinates.length === 1 ? a.geometry.coordinates[0] : null;
    const supported = lower && upper && a.h24 && poly && poly.length <= 2000 &&
      !poly.some((p, i) => Math.abs(p[0] - poly[(i + 1) % poly.length][0]) > 180) &&
      (lower.reference !== upper.reference || lower.value <= upper.value);
    for (const [i, f] of a.frequencies.entries()) {
      if (!supported || f.unit !== 2 || !/^(11[8-9]|12\d|13[0-6])\.\d{3}$/.test(f.value) || frequencies.length >= 15000) { excluded++; continue; }
      frequencies.push({
        id: `openaip-${a.id}-${i}`, label: `${a.name} · ${f.name || 'source-linked frequency'}`,
        service: 'AREA_FREQUENCY', frequencyMHz: f.value, provenance: aspSource,
        applicability: {
          area: { kind: 'polygon', ring: poly!.map(p => ({ longitude: p[0], latitude: p[1] })) },
          altitude: { lower: lower!, upper: upper! }, activeUtc: [],
          condition: [...a.conditions, 'Uncertified source; effective dates unknown; verify official frequency, source remarks and service conditions'].join('; '),
        },
      });
    }
  }
  const bounds = { west: 110, east: 155, south: -45, north: -9 };
  const extend = (lon: number, lat: number) => {
    bounds.west = Math.min(bounds.west, lon); bounds.east = Math.max(bounds.east, lon);
    bounds.south = Math.max(-85, Math.min(bounds.south, lat)); bounds.north = Math.min(85, Math.max(bounds.north, lat));
  };
  s.airports.forEach(a => extend(a.position.longitude, a.position.latitude));
  s.airspaces.forEach(a => polygons(a).forEach(poly => poly.forEach(ring => ring.forEach(p => extend(p[0], p[1])))));
  return {
    format: 'anc-navigation-v1', id: OPENAIP_PACK_ID, name: 'Australia · downloaded OpenAIP reference',
    bounds,
    provenance: aspSource, land: [],
    places: s.airports.map(a => ({
      id: `openaip-${a.id}`, name: `${a.name}${a.icao ? ` (${a.icao})` : ''}`, position: a.position,
      kind: 'aerodrome-unknown', provenance: aptSource,
      statusNote: 'OpenAIP reference; controlled/tower status and source-effective dates unknown.',
    })),
    frequencies,
    coverage: {
      aerodromes: 'partial', localities: 'absent', frequencies: frequencies.length ? 'partial' : 'absent',
      notes: `Downloaded reference only. ${excluded} linked frequency rows with unsupported units, geometry, schedules or beyond the 15,000-row lookup limit are excluded from applicability lookup; source details remain available on Map. Airport frequency rows never create geographic applicability.`,
    },
  };
}
