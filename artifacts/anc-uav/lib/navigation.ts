import type { MapBounds, NavigationFrequency, NavigationPack, Provenance } from '../data/navigation-pack';
import { distanceKm, initialBearingDegrees, type Coordinate } from './geo';
import { z } from 'zod';

export type QueryContext = {
  position: Coordinate | null;
  altitude: number | null;
  altitudeReference: 'AMSL' | 'AGL' | 'FL';
  utc: string;
};

export function parseQueryUtc(utc: string) {
  return z.string().datetime({ offset: true }).safeParse(utc).success ? Date.parse(utc) : NaN;
}

export function insideBounds(p: Coordinate, b: MapBounds) {
  return p.latitude >= b.south && p.latitude <= b.north && p.longitude >= b.west && p.longitude <= b.east;
}

/** Boundary-inclusive ray casting. Dateline-crossing polygons are rejected on import. */
export function insideRing(p: Coordinate, ring: Coordinate[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    const cross = (p.longitude - a.longitude) * (b.latitude - a.latitude) -
      (p.latitude - a.latitude) * (b.longitude - a.longitude);
    if (Math.abs(cross) < 1e-9 &&
        p.longitude >= Math.min(a.longitude, b.longitude) && p.longitude <= Math.max(a.longitude, b.longitude) &&
        p.latitude >= Math.min(a.latitude, b.latitude) && p.latitude <= Math.max(a.latitude, b.latitude)) return true;
    if ((a.latitude > p.latitude) !== (b.latitude > p.latitude) &&
        p.longitude < (b.longitude - a.longitude) * (p.latitude - a.latitude) / (b.latitude - a.latitude) + a.longitude) inside = !inside;
  }
  return inside;
}

export function sourceStatus(source: Provenance, utc: string) {
  const now = parseQueryUtc(utc);
  if (!Number.isFinite(now)) return 'TIME UNKNOWN';
  if (!source.effectiveFrom || !source.effectiveTo) return 'VALIDITY NOT SUPPLIED';
  if (now < Date.parse(source.effectiveFrom)) return 'NOT YET EFFECTIVE';
  if (now >= Date.parse(source.effectiveTo)) return 'EXPIRED';
  return 'WITHIN DATED VALIDITY';
}

export function frequencyApplicability(f: NavigationFrequency, q: QueryContext): { state: 'matches' | 'possible' | 'outside'; reasons: string[] } {
  const reasons: string[] = [];
  const a = f.applicability;
  if (!q.position) reasons.push('Position unknown');
  else if (a.area.kind === 'circle'
    ? distanceKm(q.position, a.area.centre) > a.area.radiusKm
    : !insideRing(q.position, a.area.ring)) return { state: 'outside', reasons: ['Outside published geographic area'] };
  if (q.altitude === null || !Number.isFinite(q.altitude) || q.altitudeReference !== a.altitude.reference)
    reasons.push(`Needs altitude in ${a.altitude.reference}; no datum conversion assumed`);
  else if (q.altitude < a.altitude.lower || q.altitude > a.altitude.upper)
    return { state: 'outside', reasons: ['Outside published altitude band'] };
  const time = parseQueryUtc(q.utc);
  if (!Number.isFinite(time)) reasons.push('UTC time unknown');
  else {
    if (sourceStatus(f.provenance, q.utc) !== 'WITHIN DATED VALIDITY') reasons.push(sourceStatus(f.provenance, q.utc));
    // An expired source cannot conclusively exclude a frequency by its old schedule.
    if (a.activeUtc.length && !a.activeUtc.some(t => time >= Date.parse(t.from) && time < Date.parse(t.to))) {
      if (sourceStatus(f.provenance, q.utc) === 'WITHIN DATED VALIDITY') return { state: 'outside', reasons: ['Outside published UTC schedule'] };
      reasons.push('Published schedule not active; source is not current');
    }
  }
  if (a.condition) reasons.push(`Verify service condition: ${a.condition}`);
  return { state: reasons.length ? 'possible' : 'matches', reasons };
}

export function nearbyPlaces(pack: NavigationPack, position: Coordinate) {
  return pack.places.map(place => ({
    ...place, kilometres: distanceKm(position, place.position),
    bearing: initialBearingDegrees(position, place.position),
  })).sort((a, b) => a.kilometres - b.kilometres);
}

export function lookupFrequencies(packs: NavigationPack[], query: QueryContext) {
  return packs.flatMap(pack => pack.frequencies.map(frequency => {
    const result = frequencyApplicability(frequency, query);
    const packStatus = sourceStatus(pack.provenance, query.utc);
    const reasons = [...result.reasons];
    if (packStatus !== 'WITHIN DATED VALIDITY') reasons.push(`Pack: ${packStatus}`);
    if (query.position && !insideBounds(query.position, pack.bounds)) reasons.push('Origin outside declared pack bounds');
    return {
      pack, frequency,
      state: result.state === 'outside' ? 'outside' as const : reasons.length ? 'possible' as const : 'matches' as const,
      reasons,
    };
  }));
}

export function compassDirection(bearing: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
}

export function coordinateToMap(p: Coordinate, b: MapBounds, width: number, height: number) {
  return { x: (p.longitude - b.west) / (b.east - b.west) * width, y: (b.north - p.latitude) / (b.north - b.south) * height };
}
export function mapToCoordinate(x: number, y: number, b: MapBounds, width: number, height: number): Coordinate {
  return { longitude: b.west + x / width * (b.east - b.west), latitude: b.north - y / height * (b.north - b.south) };
}
