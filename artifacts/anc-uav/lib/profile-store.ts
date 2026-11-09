import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AIRCRAFT_KEY, DEFAULT_AIRCRAFT } from './aircraft';
import {
  PROFILES_KEY, DEFAULT_LIMITS, clone, findVersion, migrateAircraft, newProfileId, normalise,
  readProfiles, validateProfileDraft, applyImport, type ImportChoices, type TransferProfile, type FieldErrors, type ProfileDraft, type ProfilesDoc, type SaveTarget,
} from './operating-profiles';

type KV = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export type ProfileState = { doc: ProfilesDoc | null; hydrated: boolean; readBlocked: boolean; error: string | null };
export type ProfileResult = { ok: true; versionId?: string } | { ok: false; error: string; fields?: FieldErrors };

/** One committed blob holds both active selection and every limit/aircraft list.
 * Legacy data is read only and retained. No UI state is published before a write succeeds. */
export function createProfileStore(storage: KV) {
  let state: ProfileState = { doc: null, hydrated: false, readBlocked: false, error: null };
  const subscribers = new Set<() => void>();
  const emit = () => subscribers.forEach(f => f());
  let chain: Promise<unknown>;
  async function load() {
    try {
      const raw = await storage.getItem(PROFILES_KEY);
      const doc = raw === null ? migrateAircraft(await storage.getItem(AIRCRAFT_KEY)) : readProfiles(raw);
      if (raw === null) await storage.setItem(PROFILES_KEY, JSON.stringify(doc));
      state = { doc, hydrated: true, readBlocked: false, error: null };
    } catch {
      state = { ...state, hydrated: true, readBlocked: true,
        error: 'Saved profiles or legacy aircraft settings could not be loaded or migrated safely. Nothing has been overwritten. Reload before editing; existing device data is retained.' };
    }
    emit();
  }
  const ready = (chain = load());
  function mutate(update: (doc: ProfilesDoc) => { doc: ProfilesDoc; versionId?: string } | string): Promise<ProfileResult> {
    const run = chain.then(async (): Promise<ProfileResult> => {
      if (!state.doc || state.readBlocked) return { ok: false, error: 'Reload saved profiles before editing. Existing data has not been overwritten.' };
      try {
        const next = update(clone(state.doc));
        if (typeof next === 'string') return { ok: false, error: next };
        next.doc.revision = state.doc.revision + 1;
        const doc = readProfiles(JSON.stringify(next.doc));
        await storage.setItem(PROFILES_KEY, JSON.stringify(doc));
        state = { doc, hydrated: true, readBlocked: false, error: null };
        emit();
        return { ok: true, versionId: next.versionId };
      } catch {
        return { ok: false, error: 'Could not save profiles on this device. Your last saved profiles and selection are unchanged. Your draft is still in the form.' };
      }
    });
    chain = run.catch(() => undefined);
    return run;
  }
  function save(draft: ProfileDraft, target?: SaveTarget): Promise<ProfileResult> {
    const validation = validateProfileDraft(draft);
    if (!validation.ok) return Promise.resolve({ ok: false, error: 'Fix the highlighted fields before saving.', fields: validation.errors });
    // Capture now so changing the form while a previous write is queued cannot alter this save.
    const value = clone(validation.value);
    return mutate(doc => {
      if (target && target.expectedRevision !== doc.revision) return 'Saved profiles changed while this draft was open. Cancel and reopen it to avoid overwriting newer settings.';
      const existing = target ? doc.profiles.find(p => p.id === target.profileId) : undefined;
      if (target && !existing) return 'That profile no longer exists. Cancel and create a new profile.';
      // Treat casing/spacing variants as the same existing ReOC group.
      value.reoc = doc.profiles.find(p => normalise(p.reoc) === normalise(value.reoc))?.reoc ?? value.reoc;
      if (doc.profiles.some(p => p.id !== existing?.id && normalise(p.reoc) === normalise(value.reoc) && normalise(p.name) === normalise(value.name)))
        return 'A profile with this name already exists under this ReOC. Choose a different name or edit that profile.';
      if (existing?.versions.some(v => v.id !== target?.versionId && normalise(v.label) === normalise(value.version.label)))
        return 'This profile already has that version label. Use a different version label.';
      const versionId = target?.versionId ?? newProfileId();
      if (target?.versionId && !existing?.versions.some(v => v.id === versionId)) return 'That version no longer exists.';
      const version = { ...value.version, id: versionId };
      if (existing) {
        if (!target?.versionId && existing.versions.length >= 50) return 'This profile has reached the limit of 50 versions.';
        existing.name = value.name; existing.reoc = value.reoc;
        existing.versions = target?.versionId ? existing.versions.map(v => v.id === versionId ? version : v) : [...existing.versions, version];
      } else {
        if (doc.profiles.length >= 100) return 'The limit of 100 profiles has been reached.';
        doc.profiles.push({ id: newProfileId(), reoc: value.reoc, name: value.name, versions: [version] });
      }
      // Saving never activates an arbitrary copy. Activation is an explicit separate action.
      return { doc, versionId };
    });
  }
  return {
    ready, get: () => state,
    subscribe(f: () => void) { subscribers.add(f); return () => { subscribers.delete(f); }; },
    reload: () => { const run = chain.then(load); chain = run.catch(() => undefined); return run; },
    save,
    /** All-or-nothing: any failure leaves saved profiles and selection untouched. */
    importProfiles: (incoming: TransferProfile[], expectedRevision: number, choices: ImportChoices) => mutate(doc => {
      if (doc.revision !== expectedRevision) return 'Saved profiles changed after this preview. Choose the file again to review the current differences.';
      try {
        const result = applyImport(doc, incoming, choices);
        return typeof result === 'string' ? result : { doc: result.doc };
      } catch (e) { return e instanceof Error ? e.message : 'The import could not be applied.'; }
    }),
    select: (versionId: string | null) => mutate(doc => {
      if (versionId !== null && !findVersion(doc, versionId)) return 'That saved profile version no longer exists.';
      doc.activeVersionId = versionId;
      return { doc };
    }),
    removeVersion: (versionId: string) => mutate(doc => {
      if (!findVersion(doc, versionId)) return 'That version no longer exists.';
      doc.profiles = doc.profiles.map(p => ({ ...p, versions: p.versions.filter(v => v.id !== versionId) })).filter(p => p.versions.length);
      if (doc.activeVersionId === versionId) doc.activeVersionId = null;
      return { doc };
    }),
    removeProfile: (profileId: string) => mutate(doc => {
      const profile = doc.profiles.find(p => p.id === profileId);
      if (!profile) return 'That profile no longer exists.';
      if (profile.versions.some(v => v.id === doc.activeVersionId)) doc.activeVersionId = null;
      doc.profiles = doc.profiles.filter(p => p.id !== profileId);
      return { doc };
    }),
    reset: (versionId: string, expectedRevision: number) => mutate(doc => {
      if (doc.revision !== expectedRevision) return 'Saved profiles changed. Review the version again before restoring defaults.';
      const match = findVersion(doc, versionId);
      if (!match) return 'That version no longer exists.';
      match.version.limits = { ...DEFAULT_LIMITS };
      match.version.aircraft = clone([...DEFAULT_AIRCRAFT]);
      match.version.manual = ''; match.version.effectiveNote = '';
      return { doc };
    }),
  };
}
export const profileStore = createProfileStore(AsyncStorage);
export function useProfiles() {
  return useSyncExternalStore(profileStore.subscribe, profileStore.get, profileStore.get);
}
