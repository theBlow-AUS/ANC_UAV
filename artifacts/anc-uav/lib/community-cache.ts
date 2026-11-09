import { COMMUNITY_KEY, MAX_SNAPSHOT_CHARS, validateCommunitySnapshot, type CommunitySnapshot } from './community-aviation';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export type CommunityState = {
  snapshot: CommunitySnapshot; ready: boolean; busy: boolean; error: string;
  usingBundled: boolean; readBlocked: boolean;
};
export function createCommunityCache(storage: Storage, bundled: CommunitySnapshot, download: () => Promise<CommunitySnapshot>) {
  validateCommunitySnapshot(bundled);
  let state: CommunityState = { snapshot: bundled, ready: false, busy: false, error: '', usingBundled: true, readBlocked: false };
  let locked = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(f => f());
  async function reload() {
    if (locked) return;
    locked = true;
    try {
      const raw = await storage.getItem(COMMUNITY_KEY);
      if (raw === null) state = { ...state, snapshot: bundled, usingBundled: true, readBlocked: false, error: '' };
      else {
        if (raw.length > MAX_SNAPSHOT_CHARS) throw new Error('Saved community data is oversized.');
        const snapshot = validateCommunitySnapshot(JSON.parse(raw));
        state = { ...state, snapshot, usingBundled: false, readBlocked: false, error: '' };
      }
    } catch {
      state = { ...state, readBlocked: true, error: 'Saved community data could not be read. The available snapshot remains usable. Reload saved data before updating; the unread copy has not been overwritten.' };
    } finally { locked = false; state = { ...state, ready: true }; emit(); }
  }
  const ready = reload();
  async function refresh(): Promise<boolean> {
    if (!state.ready || locked || state.readBlocked) {
      state = { ...state, error: state.readBlocked ? 'Reload saved data successfully before updating. The unread copy is protected.' : 'Dataset is busy; try again.' }; emit(); return false;
    }
    locked = true; state = { ...state, busy: true, error: '' }; emit();
    try {
      const snapshot = validateCommunitySnapshot(await download());
      // A truncated response can end on a valid CSV boundary. Reject unexpected loss
      // rather than silently publishing a substantially incomplete replacement.
      if (snapshot.airports.length < state.snapshot.airports.length * 0.8 ||
        snapshot.frequencies.length < state.snapshot.frequencies.length * 0.8)
        throw new Error('Update lost over 20% of records. Retained the last working snapshot; review the upstream source.');
      if (snapshot.rejectedAirports + snapshot.rejectedFrequencies > Math.max(50, (snapshot.airports.length + snapshot.frequencies.length) * 0.05))
        throw new Error('Too many invalid source records. Previous snapshot retained.');
      const raw = JSON.stringify(snapshot);
      // One validated setItem is the commit; no staging value is made active in memory.
      await storage.setItem(COMMUNITY_KEY, raw);
      state = { ...state, snapshot, usingBundled: false, error: '' };
      return true;
    } catch (e) {
      state = { ...state, error: `${e instanceof Error ? e.message : 'Update failed.'} Last working snapshot remains available.` };
      return false;
    } finally { locked = false; state = { ...state, busy: false }; emit(); }
  }
  return { ready, reload, refresh, get: () => state,
    subscribe: (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; } };
}
