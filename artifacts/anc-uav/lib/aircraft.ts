/** Pure aircraft-distance helpers: validation, migration and tile layout. No React, no storage. */
export type Aircraft = { id: string; name: string; distanceM: number; source: string };
export type AircraftDraft = { name: string; distance: string; source: string };
export type AircraftDoc = { version: 1; seeded: true; aircraft: Aircraft[] };

export const AIRCRAFT_KEY = 'anc-uav.aircraft.v1';
export const MAX_AIRCRAFT = 24;
export const NAME_MAX = 48;
export const SOURCE_MAX = 120;

export const DEFAULT_AIRCRAFT: readonly Aircraft[] = [
  { id: 'default-mini', name: 'Mini', distanceM: 500, source: 'Carried forward from previous app figure. Unverified.' },
  { id: 'default-m30t', name: 'M30T', distanceM: 1000, source: 'Carried forward from previous app figure. Unverified.' },
  { id: 'default-matrice-4-5t', name: 'Matrice 4/5T', distanceM: 800, source: 'User-specified figure. Not independently verified.' },
];

export type DraftResult = { ok: true; value: Omit<Aircraft, 'id'> } | { ok: false; errors: { name?: string; distance?: string } };

/** Parses a metre string. Accepts decimals ("812.5", "812,5"); rejects blank, zero, negative, NaN, Infinity. */
export function parseDistance(input: string): number | null {
  const t = String(input ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return null;
  return n;
}

export function validateDraft(d: AircraftDraft): DraftResult {
  const errors: { name?: string; distance?: string } = {};
  const name = String(d.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Enter an aircraft name.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name to ${NAME_MAX} characters.`;
  const dist = parseDistance(d.distance);
  if (dist === null) errors.distance = 'Enter metres greater than 0 and no more than 100000, for example 500 or 812.5.';
  if (errors.name || errors.distance) return { ok: false, errors };
  return { ok: true, value: { name, distanceM: dist as number, source: String(d.source ?? '').trim().slice(0, SOURCE_MAX) } };
}

function cleanRecord(r: unknown): Aircraft | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id || typeof o.name !== 'string' || typeof o.distanceM !== 'number') return null;
  const name = o.name.trim();
  if (!name || !Number.isFinite(o.distanceM) || o.distanceM <= 0) return null;
  return { id: o.id, name: name.slice(0, NAME_MAX), distanceM: o.distanceM, source: typeof o.source === 'string' ? o.source.slice(0, SOURCE_MAX) : '' };
}

export type LoadResult = { doc: AircraftDoc; needsWrite: boolean; error: string | null };

/** Reads the raw stored string. Missing key = first run / upgrade: seed defaults once. */
export function loadDoc(raw: string | null): LoadResult {
  if (raw == null) return { doc: { version: 1, seeded: true, aircraft: DEFAULT_AIRCRAFT.map((a) => ({ ...a })) }, needsWrite: true, error: null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.aircraft)) throw new Error('shape');
    const seen = new Set<string>();
    const aircraft = parsed.aircraft.map(cleanRecord).filter((a): a is Aircraft => !!a && !seen.has(a.id) && !!seen.add(a.id)).slice(0, MAX_AIRCRAFT);
    const dropped = parsed.aircraft.length - aircraft.length;
    return { doc: { version: 1, seeded: true, aircraft }, needsWrite: false, error: dropped > 0 ? `${dropped} saved aircraft entr${dropped === 1 ? 'y was' : 'ies were'} unreadable and skipped.` : null };
  } catch {
    // Corrupt: never silently re-seed over it. Show nothing until the user saves.
    return { doc: { version: 1, seeded: true, aircraft: [] }, needsWrite: false, error: 'Saved aircraft distances were unreadable. Nothing has been overwritten; saving a change will replace the damaged record.' };
  }
}

export function serialize(aircraft: Aircraft[]): string {
  return JSON.stringify({ version: 1, seeded: true, aircraft } satisfies AircraftDoc);
}

export function formatMetres(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return String(n);
}

export function newAircraftId(): string {
  return 'ac-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Column count for aircraft tiles from the measured container width.
 * Caps: 4 on phones, 6 on tablets. Fewer when tiles would be narrower than a readable minimum.
 */
export function aircraftColumns(opts: { width: number; tablet: boolean; count: number; fontScale?: number; gap?: number }): number {
  const { width, tablet, count } = opts;
  if (count <= 0) return 0;
  const scale = Math.max(1, opts.fontScale ?? 1);
  const gap = opts.gap ?? 10;
  const minTile = 140 * scale;
  const fit = Math.max(1, Math.floor((Math.max(0, width) + gap) / (minTile + gap)));
  return Math.max(1, Math.min(tablet ? 6 : 4, count, fit));
}

/** Row sizes: full rows of `cols`, remainder on the final row (which stretches to fill). */
export function aircraftRows(count: number, cols: number): number[] {
  if (count <= 0 || cols <= 0) return [];
  const rows: number[] = [];
  for (let left = count; left > 0; left -= cols) rows.push(Math.min(cols, left));
  return rows;
}
