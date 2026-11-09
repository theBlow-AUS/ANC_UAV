/**
 * UNVERIFIED reference comparisons only. These compare an entered number against
 * candidate figures transcribed from the supplied QRG mockup. They never produce a
 * clearance, a safe/clear verdict, a mandatory-broadcast determination or a go/no-go.
 */
export type AeroType = 'tower' | 'unc';
export type Tone = 'info' | 'warn';
export const NM = 1.852;
export const REFERENCE_KM: Record<AeroType, number> = { tower: 5.5, unc: 3 * NM };

export type Comparison = { tone: Tone; glyph: string; title: string; text: string; script: 'twr' | 'ctaf' | null };

export function aerodromeComparison(type: AeroType, km: number): Comparison {
  const refKm = REFERENCE_KM[type];
  const label = type === 'tower' ? '5.5 km (towered aerodrome)' : '3 NM / 5.56 km (uncontrolled aerodrome / HLS)';
  const within = km <= refKm;
  return {
    tone: within ? 'warn' : 'info',
    glyph: within ? '▲' : '●',
    title: within ? 'Inside mockup figure' : 'Beyond mockup figure',
    text: `${km.toFixed(2)} km is ${within ? 'within' : 'beyond'} the unverified QRG mockup figure of ${label}. This is a number comparison only, not a clearance or broadcast determination. Confirm with current charts, NOTAMs, ERSA and approved procedures.`,
    script: within ? (type === 'tower' ? 'twr' : 'ctaf') : null,
  };
}

/** Aircraft figures from the mockup. Model-specific and unverified; not universal limits. */
export const WIND_REF_MS = 12;
export const TEMP_REF_C: [number, number] = [-20, 50];
export const CHARGE_REF_C = 40;

export function windComparison(ms: number): Comparison {
  const kmh = (ms * 3.6).toFixed(1);
  const over = ms > WIND_REF_MS;
  return {
    tone: over ? 'warn' : 'info', glyph: over ? '▲' : '●', script: null,
    title: over ? 'Above mockup figure' : 'Not above mockup figure',
    text: `${ms} m/s (${kmh} km/h) against the unverified ${WIND_REF_MS} m/s figure the mockup lists for one aircraft model. Use the manufacturer limit for your aircraft and approved procedures.`,
  };
}

export function tempComparison(c: number): Comparison {
  const outside = c < TEMP_REF_C[0] || c > TEMP_REF_C[1];
  const charge = c > CHARGE_REF_C;
  return {
    tone: outside || charge ? 'warn' : 'info', glyph: outside || charge ? '▲' : '●', script: null,
    title: outside ? 'Outside mockup range' : charge ? 'Above mockup charging figure' : 'Inside mockup range',
    text: `${c} °C against the unverified mockup range of ${TEMP_REF_C[0]} to ${TEMP_REF_C[1]} °C (charging figure ${CHARGE_REF_C} °C). Model-specific; check your aircraft and battery documentation.`,
  };
}
