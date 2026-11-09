import { fetch as expoFetch } from 'expo/fetch';
import { buildCommunitySnapshot, MAX_AIRPORT_CSV_BYTES, MAX_FREQUENCY_CSV_BYTES, type CommunitySnapshot } from './community-aviation';

export const REVISION_URL = 'https://api.github.com/repos/davidmegginson/ourairports-data/git/ref/heads/main';
const ROOT = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/';

/** Hard byte limits cover streamed bodies even without Content-Length. No credentials. */
export async function limitedText(response: Response, limit: number): Promise<string> {
  if (!response.ok) throw new Error(`Public data request failed (${response.status}).`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new Error('Public data response exceeds size limit.');
  if (!response.body) throw new Error('Public data response has no readable body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error('Public data response exceeds size limit.');
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Called ONLY by explicit update action. Both CSVs pinned to the same upstream commit. */
export async function downloadCommunitySnapshot(): Promise<CommunitySnapshot> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  const get = async (url: string, limit: number) => limitedText(
    await expoFetch(url, { signal: controller.signal, credentials: 'omit', redirect: 'error' }) as unknown as Response, limit);
  try {
    const meta = JSON.parse(await get(REVISION_URL, 40000));
    const sha = meta?.object?.sha;
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid upstream dataset revision.');
    const [airports, frequencies] = await Promise.all([
      get(`${ROOT}${sha}/airports.csv`, MAX_AIRPORT_CSV_BYTES),
      get(`${ROOT}${sha}/airport-frequencies.csv`, MAX_FREQUENCY_CSV_BYTES),
    ]);
    return buildCommunitySnapshot(airports, frequencies, new Date().toISOString(), sha);
  } finally { clearTimeout(timer); controller.abort(); }
}
