import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseNavigationPack, type NavigationPack } from '../data/navigation-pack';
import referenceJson from '../data/australia-reference.json';
import { OPENAIP_AU_PACK } from '../data/openaip-pack';
import type { QueryContext } from '../lib/navigation';
import { MAX_NAVIGATION_BYTES } from '../lib/navigation-storage';

const REFERENCE = parseNavigationPack(referenceJson);
const BUILTIN_PACKS = [REFERENCE, OPENAIP_AU_PACK];
const BUILTIN_PACK_IDS = new Set(BUILTIN_PACKS.map(pack => pack.id));
const MAP_PACKS = (packs: NavigationPack[]) => packs.filter(pack => pack.land.length > 0 || pack.places.length > 0);
const KEY = 'anc-uav.navigation.v1';
type Value = {
  packs: NavigationPack[]; active: NavigationPack; ready: boolean; error: string;
  busy: boolean;
  canReset: boolean; resetUnreadable: () => Promise<void>;
  query: QueryContext; setQuery: (q: QueryContext) => void;
  liveTime: boolean; setLiveTime: (live: boolean) => void;
  altitudeInput: string; setAltitudeInput: (input: string) => void;
  install: (pack: NavigationPack) => Promise<void>;
  select: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
const Context = createContext<Value | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<{ packs: NavigationPack[]; activeId: string }>({ packs: [], activeId: REFERENCE.id });
  const current = useRef(saved);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveTime, setLiveTime] = useState(true);
  const [altitudeInput, setAltitudeInput] = useState('');
  const [clock, setClock] = useState(() => new Date().toISOString());
  const locked = useRef(false);
  const unreadable = useRef(false);
  const [query, setQuery] = useState<QueryContext>({ position: null, altitude: null, altitudeReference: 'AMSL', utc: new Date().toISOString() });
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date().toISOString()), 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!raw) return;
      const input = JSON.parse(raw);
      if (!Array.isArray(input.packs) || input.packs.length > 10 || typeof input.activeId !== 'string') throw new Error('Invalid navigation store');
      const packs = input.packs.map((p: unknown) => parseNavigationPack(p));
      if (packs.some((p: NavigationPack) => BUILTIN_PACK_IDS.has(p.id)) || new Set(packs.map((p: NavigationPack) => p.id)).size !== packs.length)
        throw new Error('Conflicting pack identifiers');
      if (input.activeId !== REFERENCE.id && !MAP_PACKS(packs).some((p: NavigationPack) => p.id === input.activeId))
        throw new Error('Selected navigation pack is missing');
      const next = { packs, activeId: input.activeId };
      if (mounted) { current.current = next; setSaved(next); }
    }).catch(() => {
      unreadable.current = true;
      if (mounted) setError('Saved navigation packs could not be read. No aviation data was loaded. Original stored data has not been overwritten.');
    }).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  async function update(transform: (s: typeof saved) => typeof saved) {
    if (!ready || locked.current) throw new Error('Navigation storage is busy; try again.');
    if (unreadable.current) throw new Error('Saved navigation storage is unreadable. It has been preserved; explicitly reset navigation storage before reimporting original pack files.');
    locked.current = true; setBusy(true);
    try {
      const next = transform(current.current);
      const raw = JSON.stringify(next);
      // Three bytes per UTF-16 code unit is a conservative UTF-8 upper bound,
      // and avoids depending on TextEncoder in the native JS runtime.
      if (raw.length * 3 > MAX_NAVIGATION_BYTES)
        throw new Error('Installed packs exceed the 8 MB device-store limit. Remove another pack first.');
      await AsyncStorage.setItem(KEY, raw);
      current.current = next; setSaved(next); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Device storage failed. Previous data remains selected.');
      throw e;
    } finally { locked.current = false; setBusy(false); }
  }
  const packs = [...BUILTIN_PACKS, ...saved.packs];
  const active = packs.find(p => p.id === saved.activeId) ?? REFERENCE;
  return <Context.Provider value={{
    packs, active, ready, error, busy, query: { ...query, utc: liveTime ? clock : query.utc }, setQuery, liveTime, setLiveTime, altitudeInput, setAltitudeInput,
    canReset: unreadable.current,
    resetUnreadable: async () => {
      if (!unreadable.current || locked.current || !ready) throw new Error('Navigation reset unavailable.');
      locked.current = true; setBusy(true);
      try {
        await AsyncStorage.removeItem(KEY);
        const next = { packs: [], activeId: REFERENCE.id };
        current.current = next; setSaved(next); unreadable.current = false; setError('');
      } finally { locked.current = false; setBusy(false); }
    },
    install: async pack => {
      const validated = parseNavigationPack(pack);
      if (BUILTIN_PACK_IDS.has(validated.id)) throw new Error('A bundled reference cannot be replaced.');
      await update(s => {
        if (!s.packs.some(p => p.id === validated.id) && s.packs.length >= 10) throw new Error('Remove a pack before installing more than 10.');
        return {
          packs: [...s.packs.filter(p => p.id !== validated.id), validated],
          activeId: MAP_PACKS([validated]).length ? validated.id : s.activeId,
        };
      });
    },
    select: async id => {
      if (!MAP_PACKS(packs).some(p => p.id === id)) throw new Error('Map pack not installed.');
      await update(s => ({ ...s, activeId: id }));
    },
    remove: async id => {
      if (BUILTIN_PACK_IDS.has(id)) throw new Error('Bundled reference cannot be removed.');
      await update(s => ({ packs: s.packs.filter(p => p.id !== id), activeId: s.activeId === id ? REFERENCE.id : s.activeId }));
    },
  }}>{children}</Context.Provider>;
}
export function useNavigation() {
  const value = useContext(Context);
  if (!value) throw new Error('NavigationProvider is missing.');
  return value;
}
