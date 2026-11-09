import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AIRCRAFT_KEY, loadDoc, MAX_AIRCRAFT, newAircraftId, serialize, type Aircraft } from './aircraft';

export type AircraftState = { aircraft: Aircraft[]; hydrated: boolean; loadError: string | null; readBlocked: boolean };
export type SaveResult = { ok: true } | { ok: false; error: string };
export type KV = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> };

/**
 * Separate key from display preferences, so writes never race ui-store.
 * Mutations queue on one chain and apply to the last *committed* list; state only changes after a successful write.
 */
export function createAircraftStore(storage: KV) {
  let state: AircraftState = { aircraft: [], hydrated: false, loadError: null, readBlocked: false };
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  let chain: Promise<unknown>;

  function load() {
    return storage.getItem(AIRCRAFT_KEY)
    .then(async (raw) => {
      const r = loadDoc(raw);
      state = { aircraft: r.doc.aircraft, hydrated: true, loadError: r.error, readBlocked: false };
      if (r.needsWrite) {
        try { await storage.setItem(AIRCRAFT_KEY, serialize(r.doc.aircraft)); }
        catch { state = { ...state, loadError: 'Default aircraft distances could not be saved to this device yet. They show until the app closes.' }; }
      }
      emit();
    })
    .catch(() => { state = { ...state, hydrated: true, readBlocked: true, loadError: 'Saved aircraft distances could not be opened. Editing is blocked to protect your saved list. Reload before making changes.' }; emit(); });
  }
  const ready = (chain = load());

  function mutate(fn: (list: Aircraft[]) => Aircraft[] | string): Promise<SaveResult> {
    const run = chain.then(async (): Promise<SaveResult> => {
      if (state.readBlocked) return { ok: false, error: 'Reload saved aircraft before making changes. Your existing list has not been overwritten.' };
      const next = fn(state.aircraft);
      if (typeof next === 'string') return { ok: false, error: next };
      try { await storage.setItem(AIRCRAFT_KEY, serialize(next)); }
      catch { return { ok: false, error: 'Could not save to this device. Your previous aircraft list is unchanged; your entry is still in the form.' }; }
      state = { ...state, aircraft: next, loadError: null };
      emit();
      return { ok: true };
    });
    chain = run.catch(() => undefined);
    return run;
  }

  return {
    ready,
    reload: () => {
      const run = chain.then(load);
      chain = run.catch(() => undefined);
      return run;
    },
    get: () => state,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    add: (a: Omit<Aircraft, 'id'>) => mutate((l) => l.length >= MAX_AIRCRAFT ? `Limit of ${MAX_AIRCRAFT} aircraft reached.` : [...l, { ...a, id: newAircraftId() }]),
    update: (id: string, a: Omit<Aircraft, 'id'>) => mutate((l) => l.some((x) => x.id === id) ? l.map((x) => x.id === id ? { ...a, id } : x) : 'That aircraft no longer exists.'),
    remove: (id: string) => mutate((l) => l.filter((x) => x.id !== id)),
  };
}

export const aircraftStore = createAircraftStore(AsyncStorage);

export function useAircraft() {
  return useSyncExternalStore(aircraftStore.subscribe, aircraftStore.get, aircraftStore.get);
}
