import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Contact = { id: string; name: string; number: string };
export type ThemeMode = 'auto' | 'day' | 'night';
export type TextScale = 1 | 1.15 | 1.3;
export type DistanceUnit = 'km' | 'nm';
export type Crew = 'solo' | 'multi';
export type UiState = {
  theme: ThemeMode;
  text: TextScale;
  unit: DistanceUnit;
  crew: Crew;
  contacts: Contact[];
  hydrated: boolean;
  storageError: string | null;
};

const KEY = 'anc-uav.ui.v1';
export const EMERGENCY: Contact = { id: '000', name: 'Emergency services', number: '000' };

/** Dial string: optional leading +, digits and single spaces, 3 to 15 digits. */
export function cleanDialString(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[0-9 ]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\s/g, '');
  const count = digits.replace('+', '').length;
  if (count < 3 || count > 15) return null;
  return digits;
}

function sanitizeContacts(input: unknown): Contact[] {
  const list = Array.isArray(input) ? input : [];
  const user = list
    .filter((c): c is Contact => !!c && typeof c === 'object' && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.number === 'string')
    .filter((c) => c.id !== EMERGENCY.id && cleanDialString(c.number) !== null && c.name.trim().length > 0)
    .slice(0, 30)
    .map((c) => ({ id: c.id, name: c.name.trim().slice(0, 60), number: c.number.trim().slice(0, 24) }));
  return [EMERGENCY, ...user];
}

function sanitize(raw: unknown): Partial<UiState> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<UiState> = {};
  if (r.theme === 'auto' || r.theme === 'day' || r.theme === 'night') out.theme = r.theme;
  if (r.text === 1 || r.text === 1.15 || r.text === 1.3) out.text = r.text;
  if (r.unit === 'km' || r.unit === 'nm') out.unit = r.unit;
  if (r.crew === 'solo' || r.crew === 'multi') out.crew = r.crew;
  if ('contacts' in r) out.contacts = sanitizeContacts(r.contacts);
  return out;
}

let state: UiState = {
  theme: 'auto', text: 1, unit: 'km', crew: 'solo', contacts: [EMERGENCY], hydrated: false, storageError: null,
};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let pending: Partial<UiState> = {};
let writeChain: Promise<void> = Promise.resolve();

function persisted() {
  const { theme, text, unit, crew, contacts } = state;
  return JSON.stringify({ theme, text, unit, crew, contacts: contacts.filter((c) => c.id !== EMERGENCY.id) });
}

function persist() {
  const snapshot = persisted();
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(KEY, snapshot))
    .then(() => {
      if (state.storageError) { state = { ...state, storageError: null }; emit(); }
    })
    .catch(() => {
      state = { ...state, storageError: 'Display and contact preferences could not be saved to this device. They apply until the app closes.' };
      emit();
    });
}

AsyncStorage.getItem(KEY)
  .then((v) => {
    let saved: Partial<UiState> = {};
    let error: string | null = null;
    if (v) {
      try { saved = sanitize(JSON.parse(v)); } catch { error = 'Saved preferences were unreadable. Defaults are in use.'; }
    }
    // Changes made before hydration finished win over stored values.
    state = { ...state, ...saved, ...pending, hydrated: true, storageError: error };
    state.contacts = sanitizeContacts(state.contacts);
    const hadPending = Object.keys(pending).length > 0;
    pending = {};
    emit();
    if (hadPending) persist();
  })
  .catch(() => {
    state = { ...state, ...pending, hydrated: true, storageError: 'Saved preferences could not be opened. Defaults are in use.' };
    pending = {};
    emit();
  });

export function setUi(patch: Partial<Pick<UiState, 'theme' | 'text' | 'unit' | 'crew' | 'contacts'>>) {
  const clean = sanitize(patch);
  state = { ...state, ...clean };
  emit();
  if (!state.hydrated) { pending = { ...pending, ...clean }; return; }
  persist();
}

export function useUiStore() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
}
