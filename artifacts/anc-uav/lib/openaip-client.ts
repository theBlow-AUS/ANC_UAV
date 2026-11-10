import { strFromU8 } from 'fflate';
import {
  OPENAIP_EXPORTS, buildOpenAipSnapshot, normalizeOpenAipRecord,
  type OpenAipInventory, type OpenAipSelection, type OpenAipDetail,
} from './openaip-data';

export type OpenAipFetch = (url: string, options: RequestInit) => Promise<Response>;
export type OpenAipProgress = { phase: string; received: number; total: number | null };
export class OpenAipError extends Error {
  constructor(public code: 'network' | 'auth' | 'permission' | 'rate' | 'not-found' | 'source' | 'cancelled', message: string, public retryAt = 0) {
    super(message);
  }
}
export function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new OpenAipError('cancelled', 'Cancelled. Previous offline data is unchanged.');
}
function decodeXml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
export function parseOpenAipInventory(xml: string): OpenAipInventory {
  if (!/<IsTruncated>false<\/IsTruncated>/.test(xml)) throw new OpenAipError('source', 'Export listing is incomplete or unsupported.');
  const rows = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(m => m[1]);
  return ['au_apt.json', 'au_asp.json'].map(key => {
    const matches = rows.filter(r => /<Key>([^<]+)<\/Key>/.exec(r)?.[1] === key);
    if (matches.length !== 1) throw new OpenAipError('source', 'Australian airport or airspace JSON exports are unavailable.');
    const row = matches[0], bytes = Number(/<Size>(\d+)<\/Size>/.exec(row)?.[1]);
    const etag = decodeXml(/<ETag>([^<]+)<\/ETag>/.exec(row)?.[1] ?? '');
    const modifiedAt = /<LastModified>([^<]+)<\/LastModified>/.exec(row)?.[1] ?? '';
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 16 * 1024 * 1024 || !etag || !Number.isFinite(Date.parse(modifiedAt)))
      throw new OpenAipError('source', 'Export metadata is missing or exceeds the 16 MiB per-file limit.');
    return { key, bytes, etag, modifiedAt: new Date(modifiedAt).toISOString() };
  }) as OpenAipInventory;
}
function statusError(r: Response): OpenAipError {
  if (r.status === 401) return new OpenAipError('auth', 'OpenAIP rejected the key. It may be invalid or revoked; replace or remove it.');
  if (r.status === 403) return new OpenAipError('permission', 'This key does not have permission for the requested OpenAIP resource.');
  if (r.status === 404) return new OpenAipError('not-found', 'The selected OpenAIP resource is no longer available.');
  if (r.status === 429) {
    const h = r.headers.get('retry-after'), seconds = h && /^\d+$/.test(h) ? Number(h) : NaN;
    const date = h ? Date.parse(h) : NaN;
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? date - Date.now() : 60000;
    const retryAt = Date.now() + Math.max(1000, Math.min(24 * 60 * 60 * 1000, delay));
    return new OpenAipError('rate', 'OpenAIP rate limit reached. Wait before trying again; saved data is unchanged.', retryAt);
  }
  return new OpenAipError('network', 'OpenAIP is unavailable. Try again later; saved data is unchanged.');
}
export async function boundedOpenAipText(fetcher: OpenAipFetch, url: string, maxBytes: number, signal: AbortSignal,
  progress?: (bytes: number) => void, headers?: Record<string, string>) {
  checkCancelled(signal);
  try {
    const r = await fetcher(url, { method: 'GET', headers, signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw statusError(r);
    if (r.url && r.url !== url) throw new OpenAipError('source', 'Unexpected provider redirect was rejected.');
    const length = Number(r.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes) throw new OpenAipError('source', 'Provider response exceeds the safe download limit.');
    if (!r.body?.getReader) throw new OpenAipError('source', 'Bounded downloads are unavailable in this environment. Use the native app.');
    const reader = r.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        checkCancelled(signal);
        const result = await reader.read();
        if (result.done) break;
        bytes += result.value.length;
        if (bytes > maxBytes) throw new OpenAipError('source', 'Provider response exceeds the safe download limit.');
        chunks.push(result.value);
        progress?.(bytes);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    checkCancelled(signal);
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
    return { text: strFromU8(raw), bytes, etag: r.headers.get('etag') };
  } catch (e) {
    checkCancelled(signal);
    if (e instanceof OpenAipError) throw e;
    // Never echo a fetch exception or provider response: it can contain credentials.
    throw new OpenAipError('network', 'Direct OpenAIP request failed. Check connectivity. Browser cross-origin restrictions may block exports; no proxy is used.');
  }
}
export async function getOpenAipInventory(fetcher: OpenAipFetch, signal: AbortSignal) {
  const r = await boundedOpenAipText(fetcher, `${OPENAIP_EXPORTS}?list-type=2&prefix=au_&max-keys=1000`, 256 * 1024, signal);
  return parseOpenAipInventory(r.text);
}
export function sameOpenAipInventory(a: OpenAipInventory, b: OpenAipInventory) {
  return a.every((f, i) => f.key === b[i].key && f.etag === b[i].etag && f.bytes === b[i].bytes && f.modifiedAt === b[i].modifiedAt);
}
export async function downloadOpenAip(fetcher: OpenAipFetch, signal: AbortSignal, onProgress: (p: OpenAipProgress) => void) {
  onProgress({ phase: 'Checking public exports', received: 0, total: null });
  const sources = await getOpenAipInventory(fetcher, signal), results: unknown[] = [];
  const total = sources.reduce((n, f) => n + f.bytes, 0);
  let complete = 0;
  for (const source of sources) {
    const r = await boundedOpenAipText(fetcher, `${OPENAIP_EXPORTS}${source.key}`, source.bytes, signal,
      received => onProgress({ phase: `Downloading ${source.key}`, received: complete + received, total }));
    if (r.bytes !== source.bytes || r.etag && r.etag !== source.etag)
      throw new OpenAipError('source', 'An export changed during download. Previous data is unchanged; try again.');
    try { results.push(JSON.parse(r.text)); }
    catch { throw new OpenAipError('source', 'An export is not valid JSON. Previous data is unchanged.'); }
    complete += r.bytes;
  }
  onProgress({ phase: 'Validating source data', received: complete, total });
  let snapshot;
  try { snapshot = buildOpenAipSnapshot(results[0], results[1], sources, new Date().toISOString()); }
  catch { throw new OpenAipError('source', 'Unsupported or incomplete source data. No records were silently skipped; previous data is unchanged.'); }
  if (!sameOpenAipInventory(sources, await getOpenAipInventory(fetcher, signal)))
    throw new OpenAipError('source', 'Export versions changed during download. Previous data is unchanged; try again.');
  checkCancelled(signal);
  return snapshot;
}
export async function getOpenAipDetail(fetcher: OpenAipFetch, selection: OpenAipSelection, key: string, signal: AbortSignal): Promise<OpenAipDetail> {
  if (!/^[a-f0-9]{24}$/.test(selection.id) || !['airport', 'airspace'].includes(selection.kind))
    throw new OpenAipError('source', 'Invalid OpenAIP selection.');
  const url = `https://api.core.openaip.net/api/${selection.kind === 'airport' ? 'airports' : 'airspaces'}/${selection.id}`;
  const r = await boundedOpenAipText(fetcher, url, 2 * 1024 * 1024, signal, undefined, { 'x-openaip-api-key': key });
  try {
    const record = normalizeOpenAipRecord(JSON.parse(r.text), selection.kind);
    if (record.id !== selection.id) throw new Error('Mismatched record');
    return { record, retrievedAt: new Date().toISOString() };
  } catch { throw new OpenAipError('source', 'Unsupported OpenAIP detail response. Existing cached data is unchanged.'); }
}
