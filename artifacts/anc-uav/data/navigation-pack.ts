import { z } from 'zod';

const text = z.string().trim().min(1).max(1500);
const date = z.string().datetime({ offset: true });
const sourceUrl = z.string().url().regex(/^https:\/\//, 'Source must be an HTTPS URL.');
const coordinate = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
const bounds = z.object({
  south: z.number().min(-85).max(85),
  north: z.number().min(-85).max(85),
  west: z.number().min(-180).max(180),
  east: z.number().min(-180).max(180),
}).strict().refine(b => b.south < b.north && b.west < b.east, 'Bounds must increase; split antimeridian areas into separate packs.');
const provenance = z.object({
  publisher: text,
  source: sourceUrl,
  edition: text,
  effectiveFrom: date.nullable(),
  effectiveTo: date.nullable(),
  retrievedAt: date,
  licence: text,
  rightsReference: text,
  attribution: text,
}).strict().refine(p => !p.effectiveFrom || !p.effectiveTo || Date.parse(p.effectiveTo) > Date.parse(p.effectiveFrom), 'Invalid source validity interval.');
const area = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'), centre: coordinate, radiusKm: z.number().positive().max(2000) }).strict(),
  z.object({ kind: z.literal('polygon'), ring: z.array(coordinate).min(3).max(2000) }).strict(),
]);
const applicability = z.object({
  area,
  altitude: z.object({
    reference: z.enum(['AMSL', 'AGL', 'FL']),
    lower: z.number().min(-2000).max(100000),
    upper: z.number().min(-2000).max(100000),
  }).strict().refine(a => a.lower <= a.upper),
  // Empty means H24 within the source validity interval. Otherwise the union
  // of explicitly expanded UTC intervals applies (no local-time assumptions).
  activeUtc: z.array(z.object({ from: date, to: date }).strict().refine(t => Date.parse(t.from) < Date.parse(t.to))).max(2000),
  condition: z.string().max(1500),
}).strict();

export const navigationPackSchema = z.object({
  format: z.literal('anc-navigation-v1'),
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: text,
  bounds,
  provenance,
  coverage: z.object({
    aerodromes: z.enum(['absent', 'partial', 'complete']),
    localities: z.enum(['absent', 'partial', 'complete']),
    frequencies: z.enum(['absent', 'partial', 'complete']),
    notes: text,
  }).strict(),
  land: z.array(z.array(coordinate).min(3).max(20000)).max(1000),
  places: z.array(z.object({
    id: text, name: text, position: coordinate,
    kind: z.enum(['controlled', 'uncontrolled', 'aerodrome-unknown', 'locality']),
    provenance,
    // Controlled/uncontrolled is a source classification, not a live tower status.
    statusNote: text,
  }).strict()).max(15000),
  frequencies: z.array(z.object({
    id: text, label: text,
    service: z.enum(['CTAF', 'TOWER', 'APPROACH', 'CENTRE', 'ATIS', 'BROADCAST']),
    frequencyMHz: z.string().regex(/^(11[8-9]|12\d|13[0-6])\.\d{3}$/),
    aerodromeId: z.string().optional(),
    provenance, applicability,
  }).strict()).max(15000),
}).strict().superRefine((p, ctx) => {
  for (const [name, records] of [['place', p.places], ['frequency', p.frequencies]] as const) {
    if (new Set(records.map(r => r.id)).size !== records.length)
      ctx.addIssue({ code: 'custom', message: `Duplicate ${name} identifiers.` });
  }
  for (const f of p.frequencies) {
    if (f.service === 'CTAF' && !f.aerodromeId)
      ctx.addIssue({ code: 'custom', message: 'CTAF requires an aerodrome reference.' });
    if (f.aerodromeId && !p.places.some(a => a.id === f.aerodromeId && a.kind !== 'locality'))
      ctx.addIssue({ code: 'custom', message: 'Unknown aerodrome reference.' });
    if (f.applicability.area.kind === 'polygon') {
      const ring = f.applicability.area.ring;
      if (ring.some((v, i) => Math.abs(v.longitude - ring[(i + 1) % ring.length].longitude) > 180))
        ctx.addIssue({ code: 'custom', message: 'Split dateline-crossing polygons before import.' });
    }
  }
  if (p.coverage.aerodromes === 'absent' && p.places.some(a => a.kind !== 'locality') ||
      p.coverage.localities === 'absent' && p.places.some(a => a.kind === 'locality') ||
      p.coverage.frequencies === 'absent' && p.frequencies.length > 0)
    ctx.addIssue({ code: 'custom', message: 'Records conflict with declared absent coverage.' });
});

export type NavigationPack = z.infer<typeof navigationPackSchema>;
export type NavigationPlace = NavigationPack['places'][number];
export type NavigationFrequency = NavigationPack['frequencies'][number];
export type Provenance = NavigationPack['provenance'];
export type MapBounds = NavigationPack['bounds'];

export function parseNavigationPack(input: unknown): NavigationPack {
  const parsed = navigationPackSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid navigation pack: ${parsed.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return parsed.data;
}
