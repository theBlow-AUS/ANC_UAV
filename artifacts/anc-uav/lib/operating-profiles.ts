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
const versionSchema = z.object({
  id, label: z.string().trim().min(1).max(40), operationType: z.enum(OPERATIONS),
  customOperation: z.string().trim().max(80), manual: z.string().trim().max(500),
  effectiveNote: z.string().trim().max(200), limits: limitsSchema, aircraft: aircraftList,
}).strict().refine(v => v.operationType !== 'CUSTOM' || !!v.customOperation, 'Describe the custom operation.');
const profileSchema = z.object({
  id, reoc: z.string().trim().min(1).max(120), name: short,
  versions: z.array(versionSchema).min(1).max(50),
}).strict();
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
