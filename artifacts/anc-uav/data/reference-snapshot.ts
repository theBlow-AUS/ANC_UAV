import { providerAccess, type ReferenceProvider } from './provider-access';

export type SnapshotFormat = 'pdf' | 'text' | 'png' | 'jpeg';
export type SnapshotManifest = {
  schemaVersion: 1;
  provider: ReferenceProvider;
  referenceId: string;
  title: string;
  sourceUrl: string;
  sourceIssuedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  rightsReference: string;
  authorizedUseScope: string;
  format: SnapshotFormat;
};
export type ReferenceSnapshot = SnapshotManifest & {
  id: string;
  importedAt: string;
  contentState: 'user-imported-unverified';
};
export const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;

function plain(value: unknown, label: string, max = 1000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      /[\u0000-\u0008]|<\s*(script|iframe|html)|javascript:/i.test(value))
    throw new Error(`${label} must be non-empty plain text (up to ${max} characters).`);
  return value.trim();
}

export function snapshotUtc(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))
    throw new Error(`${label} must be an ISO UTC timestamp ending in Z, or null if unknown.`);
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value.slice(0, 19))
    throw new Error(`${label} is not a real UTC date.`);
  return new Date(time).toISOString();
}

export function parseSnapshotManifest(value: unknown, expectedProvider?: ReferenceProvider): SnapshotManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Choose a reference snapshot manifest JSON object.');
  const v = value as Record<string, unknown>;
  const fields = ['schemaVersion', 'provider', 'referenceId', 'title', 'sourceUrl', 'sourceIssuedAt',
    'effectiveFrom', 'effectiveTo', 'rightsReference', 'authorizedUseScope', 'format'];
  if (Object.keys(v).some((key) => !fields.includes(key)))
    throw new Error('Unsupported manifest fields. A manifest cannot supply credentials, approvals, endpoints or local paths.');
  if (v.schemaVersion !== 1 || !['airservices', 'naips', 'weathercams'].includes(String(v.provider)))
    throw new Error('Unsupported snapshot schema or provider.');
  const provider = v.provider as ReferenceProvider;
  providerAccess(provider);
  if (expectedProvider && provider !== expectedProvider) throw new Error('The manifest is for a different provider.');
  const referenceId = plain(v.referenceId, 'Reference ID', 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(referenceId)) throw new Error('Reference ID may contain only letters, digits, _ and -.');
  const format = v.format as SnapshotFormat;
  const allowed = provider === 'weathercams' ? ['png', 'jpeg'] : provider === 'airservices' ? ['pdf'] : ['pdf', 'text'];
  if (!allowed.includes(format)) throw new Error('File format is not supported for this provider.');
  const sourceUrl = plain(v.sourceUrl, 'Source URL', 1500);
  let url: URL;
  try { url = new URL(sourceUrl); } catch { throw new Error('Source URL must be an official HTTPS provider URL.'); }
  const host = provider === 'weathercams' ? 'weathercams.airservicesaustralia.com' : 'www.airservicesaustralia.com';
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password || url.search || url.hash ||
      (provider === 'naips' && !url.pathname.toLowerCase().startsWith('/naips/')) ||
      (provider === 'airservices' && !url.pathname.toLowerCase().startsWith('/aip/')))
    throw new Error('Use the official provider source URL without credentials, query strings or fragments.');
  const sourceIssuedAt = snapshotUtc(v.sourceIssuedAt, 'Source issued/captured at');
  const effectiveFrom = snapshotUtc(v.effectiveFrom, 'Effective from');
  const effectiveTo = snapshotUtc(v.effectiveTo, 'Effective to');
  if (effectiveFrom && effectiveTo && Date.parse(effectiveTo) <= Date.parse(effectiveFrom))
    throw new Error('Effective to must be later than effective from.');
  return {
    schemaVersion: 1, provider, referenceId, format,
    title: plain(v.title, 'Title', 200), sourceUrl: url.toString(),
    sourceIssuedAt, effectiveFrom, effectiveTo,
    rightsReference: plain(v.rightsReference, 'Rights/licence reference', 2000),
    authorizedUseScope: plain(v.authorizedUseScope, 'Operator/agency and permitted use', 2000),
  };
}

export function snapshotStatus(snapshot: SnapshotManifest, now = Date.now()): string {
  if (snapshot.provider === 'weathercams') return 'HISTORICAL IMAGE — NOT CURRENT WEATHER';
  if (snapshot.sourceIssuedAt && Date.parse(snapshot.sourceIssuedAt) > now) return 'FUTURE SOURCE DATE — CHECK DEVICE CLOCK';
  if (snapshot.effectiveTo && now >= Date.parse(snapshot.effectiveTo)) return 'STALE — DECLARED VALIDITY EXPIRED';
  if (snapshot.effectiveFrom && now < Date.parse(snapshot.effectiveFrom)) return 'NOT YET EFFECTIVE';
  if (!snapshot.sourceIssuedAt || !snapshot.effectiveFrom || !snapshot.effectiveTo) return 'CURRENCY UNKNOWN — DATES MISSING';
  return 'WITHIN DECLARED DATES — CURRENCY NOT VERIFIED';
}

/** Structural checks only, never a verification of aviation content or issuer. */
export function validateSnapshotBytes(format: SnapshotFormat, head: number[], tail: number[], text?: string) {
  const ascii = (bytes: number[]) => bytes.map((b) => String.fromCharCode(b)).join('');
  if (format === 'text') {
    if (!text?.trim() || text.length > 180_000 || /[\u0000-\u0008]|<\s*(html|script|iframe)|javascript:|�/i.test(text))
      throw new Error('Briefing must be non-empty plain UTF-8 text up to 180,000 characters, not a login/error HTML page.');
  } else if (format === 'pdf') {
    if (!ascii(head).startsWith('%PDF-') || !ascii(tail).includes('%%EOF'))
      throw new Error('The selected file is not a structurally complete PDF.');
  } else if (format === 'png') {
    if (![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => head[i] === b) ||
        ascii(head.slice(12, 16)) !== 'IHDR' ||
        ![0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130].every((b, i) => tail[tail.length - 12 + i] === b))
      throw new Error('The selected file is not a complete PNG image.');
  } else if (format === 'jpeg') {
    if (head[0] !== 255 || head[1] !== 216 || head[2] !== 255 ||
        tail[tail.length - 2] !== 255 || tail[tail.length - 1] !== 217)
      throw new Error('The selected file is not a complete JPEG image.');
  } else throw new Error('Unsupported snapshot format.');
}
