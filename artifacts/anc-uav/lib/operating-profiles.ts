import { z } from 'zod';
import { DEFAULT_AIRCRAFT, MAX_AIRCRAFT, parseDistance, type Aircraft } from './aircraft';

export const PROFILES_KEY = 'anc-uav.operating-profiles.v1';
export const DEFAULT_LIMITS = { maxHeightM: 120, peopleM: 30, verticalFt: 500, horizontalM: 1500 };
export const OPERATIONS = ['VLOS', 'EVLOS', 'BVLOS', 'CUSTOM'] as const;
export type Operation = typeof OPERATIONS[number];
const id = z.string().min(1).max(100);
const short = z.string().trim().min(1).max(80);
const number = z.number().finite().positive().max(100000);
const aircraftSchema = z.object({
  id, name: z.string().trim().min(1).max(48), distanceM: number, source: z.string().max(120),
}).strict();
const aircraftList = z.array(aircraftSchema).max(MAX_AIRCRAFT).refine(a => new Set(a.map(x => x.id)).size === a.length, 'Duplicate aircraft IDs.');
const limitsSchema = z.object({ maxHeightM: number, peopleM: number, verticalFt: number, horizontalM: number }).strict();
const versionShape = {
  label: z.string().trim().min(1).max(40), operationType: z.enum(OPERATIONS),
  customOperation: z.string().trim().max(80), manual: z.string().trim().max(500),
  effectiveNote: z.string().trim().max(200), limits: limitsSchema, aircraft: aircraftList,
};
const customCheck = [(v: { operationType: string; customOperation: string }) => v.operationType !== 'CUSTOM' || !!v.customOperation, 'Describe the custom operation.'] as const;
const versionSchema = z.object({ id, ...versionShape }).strict().refine(...customCheck);
const importVersionSchema = z.object(versionShape).strict().refine(...customCheck);
const profileSchema = z.object({
  id, reoc: z.string().trim().min(1).max(120), name: short,
  versions: z.array(versionSchema).min(1).max(50),
}).strict();
const importProfileSchema = z.object({
  reoc: z.string().trim().min(1).max(120), name: short,
  versions: z.array(importVersionSchema).min(1).max(50),
}).strict();
export const TRANSFER_FORMAT = 'anc-uav.reoc-profiles';
export const TRANSFER_MAX_CHARS = 2_000_000;
const transferSchema = z.object({
  format: z.literal(TRANSFER_FORMAT), formatVersion: z.literal(1), exportedAt: z.string().max(40), notice: z.string().max(1000),
  profiles: z.array(importProfileSchema).min(1).max(100),
}).strict().superRefine((t, ctx) => {
  const identities = new Set<string>();
  for (const p of t.profiles) {
    const identity = JSON.stringify([normalise(p.reoc), normalise(p.name)]);
    if (identities.has(identity)) ctx.addIssue({ code: 'custom', message: 'The file lists the same profile twice.' });
    identities.add(identity);
    const labels = new Set(p.versions.map(v => normalise(v.label)));
    if (labels.size !== p.versions.length) ctx.addIssue({ code: 'custom', message: 'The file repeats a version label within a profile.' });
  }
});
export type TransferVersion = z.infer<typeof importVersionSchema>;
export type TransferProfile = z.infer<typeof importProfileSchema>;

const docSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(),
  activeVersionId: id.nullable(), profiles: z.array(profileSchema).max(100),
}).strict().superRefine((doc, ctx) => {
  const ids = new Set<string>();
  const identities = new Set<string>();
  for (const p of doc.profiles) {
    const identity = JSON.stringify([normalise(p.reoc), normalise(p.name)]);
    if (ids.has(p.id) || identities.has(identity)) ctx.addIssue({ code: 'custom', message: 'Duplicate profile identity.' });
    ids.add(p.id); identities.add(identity);
    const labels = new Set<string>();
    for (const v of p.versions) {
      if (ids.has(v.id) || labels.has(normalise(v.label))) ctx.addIssue({ code: 'custom', message: 'Duplicate version identity.' });
      ids.add(v.id); labels.add(normalise(v.label));
    }
  }
  if (doc.activeVersionId && !doc.profiles.some(p => p.versions.some(v => v.id === doc.activeVersionId)))
    ctx.addIssue({ code: 'custom', message: 'The selected version is missing.' });
});

export type Limits = z.infer<typeof limitsSchema>;
export type ProfileVersion = z.infer<typeof versionSchema>;
export type OperatingProfile = z.infer<typeof profileSchema>;
export type ProfilesDoc = z.infer<typeof docSchema>;
export type ProfileDraft = {
  reoc: string; name: string; label: string; operationType: Operation; customOperation: string;
  manual: string; effectiveNote: string; maxHeightM: string; peopleM: string; verticalFt: string; horizontalM: string;
  aircraft: Aircraft[];
};
export type SaveTarget = { profileId: string; versionId?: string; expectedRevision: number };
export type FieldErrors = Partial<Record<keyof ProfileDraft, string>>;
export function normalise(text: string) { return text.trim().replace(/\s+/g, ' ').toLowerCase(); }
export function newProfileId() { return 'op-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function findVersion(doc: ProfilesDoc | null, versionId: string | null) {
  for (const profile of doc?.profiles ?? []) {
    const version = profile.versions.find(v => v.id === versionId);
    if (version) return { profile, version };
  }
  return null;
}
export function readProfiles(raw: string): ProfilesDoc {
  if (raw.length > 2_000_000) throw new Error('Saved profile data exceeds the supported size.');
  return docSchema.parse(JSON.parse(raw));
}
export function starterDoc(aircraft: Aircraft[] = clone([...DEFAULT_AIRCRAFT])): ProfilesDoc {
  return docSchema.parse({
    version: 1, revision: 0, activeVersionId: 'starter-version',
    profiles: [{ id: 'starter-profile', reoc: 'Unassigned operator / ReOC', name: 'Starter reference',
      versions: [{ id: 'starter-version', label: '1', operationType: 'CUSTOM', customOperation: 'Reference only',
        manual: '', effectiveNote: '', limits: { ...DEFAULT_LIMITS }, aircraft }] }],
  });
}
/** Migration is all-or-nothing. Never discard or silently reseed damaged legacy entries. */
export function migrateAircraft(raw: string | null): ProfilesDoc {
  if (raw === null) return starterDoc();
  if (raw.length > 2_000_000) throw new Error('Legacy aircraft data is too large.');
  const legacy = z.object({ version: z.literal(1), aircraft: aircraftList }).passthrough().parse(JSON.parse(raw));
  return starterDoc(legacy.aircraft);
}
export function toDraft(profile: OperatingProfile, version: ProfileVersion): ProfileDraft {
  return {
    reoc: profile.reoc, name: profile.name, label: version.label, operationType: version.operationType,
    customOperation: version.customOperation, manual: version.manual, effectiveNote: version.effectiveNote,
    maxHeightM: String(version.limits.maxHeightM), peopleM: String(version.limits.peopleM),
    verticalFt: String(version.limits.verticalFt), horizontalM: String(version.limits.horizontalM),
    aircraft: clone(version.aircraft),
  };
}
export function starterDraft(): ProfileDraft {
  const p = starterDoc().profiles[0];
  return toDraft(p, p.versions[0]);
}
export function validateProfileDraft(d: ProfileDraft):
  { ok: true; value: { reoc: string; name: string; version: Omit<ProfileVersion, 'id'> } } |
  { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const text = (key: 'reoc' | 'name' | 'label' | 'customOperation' | 'manual' | 'effectiveNote', max: number, required = true) => {
    const value = typeof d[key] === 'string' ? d[key].trim() : '';
    if ((required && !value) || value.length > max) errors[key] = `Enter ${required ? '1' : '0'}–${max} characters.`;
    return value;
  };
  const reoc = text('reoc', 120), name = text('name', 80), label = text('label', 40);
  const customOperation = text('customOperation', 80, d.operationType === 'CUSTOM');
  const manual = text('manual', 500, false), effectiveNote = text('effectiveNote', 200, false);
  if (!OPERATIONS.includes(d.operationType)) errors.operationType = 'Select an operation type.';
  const limits = {} as Limits;
  for (const key of Object.keys(DEFAULT_LIMITS) as (keyof Limits)[]) {
    const value = parseDistance(d[key]);
    if (value === null) errors[key] = 'Enter a number greater than 0 and no more than 100000. Decimals allowed.';
    else limits[key] = value;
  }
  const aircraft = aircraftList.safeParse(d.aircraft);
  if (!aircraft.success) errors.aircraft = 'Check aircraft names, unique IDs, source notes and positive distances (maximum 100000 m). Up to 24 aircraft.';
  if (Object.keys(errors).length || !aircraft.success) return { ok: false, errors };
  return { ok: true, value: { reoc, name, version: {
    label, operationType: d.operationType, customOperation, manual, effectiveNote, limits, aircraft: aircraft.data,
  } } };
}

/** Explicit backup file: profiles, versions, limits, aircraft and notes only. No selection, revision, preferences, credentials or incident data. */
export function exportProfiles(doc: ProfilesDoc, now = new Date()): string {
  return JSON.stringify({
    format: TRANSFER_FORMAT, formatVersion: 1, exportedAt: now.toISOString(),
    notice: 'Operator-entered reference figures exported from ANC UAV. ReOC names, manual notes and version labels are unverified declarations and are not approval or authorisation. Importing this file does not select a version.',
    profiles: doc.profiles.map(p => ({
      reoc: p.reoc, name: p.name,
      versions: p.versions.map(({ id: _id, ...v }) => v),
    })),
  }, null, 2);
}
export function parseTransfer(raw: string): TransferProfile[] {
  if (raw.length > TRANSFER_MAX_CHARS) throw new Error('This file is larger than the supported profile size.');
  let json: unknown;
  try { json = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON.'); }
  const parsed = transferSchema.safeParse(json);
  if (!parsed.success) throw new Error('This is not a valid ANC UAV ReOC profile backup, or it contains unsupported or unexpected fields. Nothing was imported.');
  return parsed.data.profiles;
}
export type VersionPlan = { key: string; label: string; status: 'add' | 'same' | 'conflict'; incoming: TransferVersion };
export type ProfilePlan = { index: number; reoc: string; name: string; isNew: boolean; versions: VersionPlan[] };
const sameContent = (a: TransferVersion, b: TransferVersion) => JSON.stringify(a) === JSON.stringify(b);
const stripId = ({ id: _id, ...rest }: ProfileVersion): TransferVersion => rest;
/** Compare incoming with saved data by ReOC + profile name, then version label. Pure; nothing is changed. */
export function planImport(doc: ProfilesDoc, incoming: TransferProfile[]): ProfilePlan[] {
  return incoming.map((p, index) => {
    const existing = doc.profiles.find(e => normalise(e.reoc) === normalise(p.reoc) && normalise(e.name) === normalise(p.name));
    return { index, reoc: p.reoc, name: p.name, isNew: !existing, versions: p.versions.map((v, vi) => {
      const match = existing?.versions.find(e => normalise(e.label) === normalise(v.label));
      return { key: `${index}:${vi}`, label: v.label, incoming: v,
        status: !match ? 'add' as const : sameContent(stripId(match), v) ? 'same' as const : 'conflict' as const };
    }) };
  });
}
export type ImportChoices = { replaceKeys: string[]; activateKey: string | null };
/** Applies a plan to a document copy. Existing versions are replaced only for keys in replaceKeys; selection changes only for activateKey. */
export function applyImport(doc: ProfilesDoc, incoming: TransferProfile[], choices: ImportChoices): { doc: ProfilesDoc; activeId: string | null } | string {
  const replace = new Set(choices.replaceKeys);
  const ids = new Map<string, string>();
  incoming.forEach((p, index) => {
    let target = doc.profiles.find(e => normalise(e.reoc) === normalise(p.reoc) && normalise(e.name) === normalise(p.name));
    const fresh = !target;
    if (!target) {
      if (doc.profiles.length >= 100) throw new Error('The limit of 100 profiles would be exceeded.');
      target = { id: newProfileId(), reoc: doc.profiles.find(e => normalise(e.reoc) === normalise(p.reoc))?.reoc ?? p.reoc, name: p.name, versions: [] };
      doc.profiles.push(target);
    }
    p.versions.forEach((v, vi) => {
      const key = `${index}:${vi}`;
      const match = target!.versions.find(e => normalise(e.label) === normalise(v.label));
      if (match) {
        if (replace.has(key) && !sameContent(stripId(match), v)) Object.assign(match, clone(v));
        ids.set(key, match.id);
      } else {
        if (target!.versions.length >= 50) throw new Error('A profile would exceed the limit of 50 versions.');
        const added = { ...clone(v), id: newProfileId() };
        target!.versions.push(added);
        ids.set(key, added.id);
      }
    });
    void fresh;
  });
  const activeId = choices.activateKey ? ids.get(choices.activateKey) ?? null : null;
  if (choices.activateKey && !activeId) return 'The version chosen for use is not in this file.';
  if (activeId) doc.activeVersionId = activeId;
  return { doc, activeId };
}
