import { strToU8 } from 'fflate';
import { checkCancelled } from './openaip-client';

export interface OpenAipDisk {
  getPointer(namespace: string): Promise<string | null>;
  setPointer(namespace: string, value: string | null): Promise<void>;
  read(name: string): Promise<string | null>;
  write(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
  list(): Promise<string[]>;
}
type Index = { current: string; previous: string | null };
export type StoredOpenAip<T> = { value: T | null; bytes: number; recovered: boolean };
const validName = (namespace: string, name: unknown): name is string =>
  typeof name === 'string' && new RegExp(`^${namespace}-[a-z0-9-]+\\.json$`).test(name);

/**
 * Immutable files + a tiny atomic preference pointer. A failed stage never
 * overwrites the active file. Keep one last-good generation for recovery.
 * Disk writes must atomically replace a single pointer key (AsyncStorage).
 */
export function createOpenAipRepository<T>(disk: OpenAipDisk, namespace: 'snapshot' | 'details', parse: (v: unknown) => T, maxBytes: number) {
  let locked = false;
  let active: { name: string; bytes: number } | null = null;
  async function index(): Promise<Index | null> {
    const raw = await disk.getPointer(namespace);
    if (raw === null) return null;
    const i = JSON.parse(raw);
    if (!i || !validName(namespace, i.current) || i.previous !== null && !validName(namespace, i.previous) || i.current === i.previous)
      throw new Error('OpenAIP storage index is unreadable. Files have been preserved; use Remove downloaded data to reset this source only.');
    return i;
  }
  async function readFile(name: string) {
    const raw = await disk.read(name);
    if (raw === null || raw.length > maxBytes) throw new Error('Invalid stored snapshot');
    const bytes = strToU8(raw).length;
    if (bytes > maxBytes) throw new Error('Invalid stored snapshot');
    return { value: parse(JSON.parse(raw)), bytes };
  }
  return {
    activeName: () => active?.name ?? null,
    async load(): Promise<StoredOpenAip<T>> {
      const i = await index();
      if (!i) { active = null; return { value: null, bytes: 0, recovered: false }; }
      try {
        const result = await readFile(i.current);
        active = { name: i.current, bytes: result.bytes };
        let backupBytes = 0;
        if (i.previous) { try { backupBytes = (await readFile(i.previous)).bytes; } catch { /* Current validated copy remains usable. */ } }
        return { ...result, bytes: result.bytes + backupBytes, recovered: false };
      } catch {
        if (i.previous) {
          try {
            const result = await readFile(i.previous);
            active = { name: i.previous, bytes: result.bytes };
            return { ...result, recovered: true };
          } catch { /* Neither file can be trusted; do not silently replace either. */ }
        }
        throw new Error('Saved OpenAIP data could not be validated. Files were preserved; bundled/imported references are unaffected. Remove downloaded data to reset this source only.');
      }
    },
    async save(value: T, signal?: AbortSignal): Promise<StoredOpenAip<T>> {
      if (locked) throw new Error('OpenAIP storage is busy.');
      locked = true;
      const name = `${namespace}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.json`;
      let committed = false;
      try {
        checkCancelled(signal);
        // Refuse to replace unknown unreadable data without an explicit reset.
        const i = await index();
        if (i && !active) throw new Error('Load or explicitly reset the existing OpenAIP store before updating it.');
        const validated = parse(value), raw = JSON.stringify(validated), bytes = strToU8(raw).length;
        if (bytes > maxBytes) throw new Error('OpenAIP data exceeds the device snapshot limit. Previous data is unchanged.');
        await disk.write(name, raw);
        await readFile(name); // Detect incomplete writes before publishing the pointer.
        checkCancelled(signal);
        const previous = active;
        await disk.setPointer(namespace, JSON.stringify({ current: name, previous: previous?.name ?? null }));
        committed = true;
        active = { name, bytes };
        // Retire only the older generation after the new pointer is durable.
        // Failed cleanup cannot invalidate the successful commit.
        try {
          for (const old of await disk.list()) {
            if (validName(namespace, old) && old !== name && old !== previous?.name) await disk.remove(old);
          }
        } catch { /* Explicit removal can clean abandoned stages if cleanup fails. */ }
        return { value: validated, bytes: bytes + (previous?.bytes ?? 0), recovered: false };
      } finally {
        if (!committed) await disk.remove(name).catch(() => undefined);
        locked = false;
      }
    },
    async clear() {
      if (locked) throw new Error('OpenAIP storage is busy.');
      locked = true;
      try {
        // Includes abandoned staged files, but never other providers/imported packs.
        const names = (await disk.list()).filter(n => validName(namespace, n));
        for (const name of names) await disk.remove(name);
        await disk.setPointer(namespace, null);
        active = null;
      } finally { locked = false; }
    },
  };
}
