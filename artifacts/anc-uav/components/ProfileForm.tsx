import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, Callout, DISPLAY, Panel, Seg, TextField } from '@/components/FieldKit';
import { AircraftEditor } from '@/components/AircraftKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { OPERATIONS, type FieldErrors, type Operation, type ProfileDraft, type SaveTarget } from '@/lib/operating-profiles';
import { profileStore } from '@/lib/profile-store';

export type FormMode = 'new' | 'duplicate' | 'edit' | 'version';
const TITLES: Record<FormMode, string> = {
  new: 'New profile', duplicate: 'Duplicate as new profile', edit: 'Edit version', version: 'Add new version',
};
const OP_LABELS: Record<Operation, string> = { VLOS: 'VLOS', EVLOS: 'EVLOS', BVLOS: 'BVLOS', CUSTOM: 'Custom' };

/** Full draft for one profile version. Draft survives failed saves; only Cancel discards it. */
export function ProfileForm({ mode, initial, target, reocOptions, versionCount, onSaved, onCancel }: {
  mode: FormMode; initial: ProfileDraft; target?: SaveTarget; reocOptions: string[]; versionCount: number;
  onSaved: (message: string) => void; onCancel: () => void;
}) {
  const c = useColors();
  const ui = useUi();
  const [d, setD] = useState<ProfileDraft>(initial);
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aircraftStaged, setAircraftStaged] = useState(false);
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const sharedChange = !!target;

  const save = async () => {
    if (busy || aircraftStaged) return;
    setBusy(true); setError(null);
    try {
      const res = await profileStore.save(d, target);
      if (!res.ok) { setError(res.error); setFields(res.fields ?? {}); return; }
      onSaved(`Saved ${d.name.trim()} version ${d.label.trim()}. ${mode === 'edit'
        ? 'If this version is in use, Aviate now shows these saved changes.'
        : 'This new version is not in use on Aviate until you press Use version.'}`);
    } catch {
      setError('Could not save. Your draft is still in the form.');
    } finally {
      setBusy(false);
    }
  };

  const limit = (key: 'maxHeightM' | 'peopleM' | 'verticalFt' | 'horizontalM', label: string, unit: string) => (
    <TextField label={`${label} (${unit})`} value={d[key]} onChangeText={(t) => set(key, t)} keyboardType="decimal-pad" editable={!busy}
      testID={`profile-${key}`} hint={fields[key] ?? `Fixed unit: ${unit}. Enter the figure from your manual.`} />
  );

  return (
    <Panel>
      <View testID="profile-form" style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(26), textTransform: 'uppercase' }}>{TITLES[mode]}</Text>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700', marginBottom: 6 }}>
          Enter what your own operations manual states. Saving does not verify the figures, grant approval or make the version active.
        </Text>
        {mode === 'edit' ? <Callout title="Editing a saved version">If this version is in use, saving changes updates Aviate immediately. Add a new version instead if you want to preserve these saved figures.</Callout> : null}
        <TextField label="Operator / ReOC" value={d.reoc} onChangeText={(t) => set('reoc', t)} maxLength={120} editable={!busy} testID="profile-reoc"
          placeholder="Operator name or ReOC number" hint={fields.reoc ?? 'Pick an existing operator below or type a new one.'} />
        {reocOptions.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {reocOptions.map((r) => {
              const on = r === d.reoc.trim();
              return (
                <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: on, disabled: busy }} accessibilityLabel={`Use operator ${r}`} disabled={busy}
                  onPress={() => set('reoc', r)} style={{ maxWidth: '100%', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 3, borderColor: c.ink, backgroundColor: on ? c.ink : 'transparent' }}>
                  <Text style={{ color: on ? c.background : c.foreground, fontSize: ui.fs(14), fontWeight: '800' }}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <TextField label="Profile name" value={d.name} onChangeText={(t) => set('name', t)} maxLength={80} editable={!busy} testID="profile-name"
          placeholder="Survey ops, Night ops" hint={fields.name} />
        {sharedChange ? (
          <Callout title="Applies to every version">{`Operator / ReOC and profile name belong to the whole profile. Changing them renames or moves its ${versionCount} existing version${versionCount === 1 ? '' : 's'} as well as any new version.`}</Callout>
        ) : null}
        <TextField label="Version label" value={d.label} onChangeText={(t) => set('label', t)} maxLength={40} editable={!busy} testID="profile-label"
          placeholder="2, 3.1, Jan 2025" hint={fields.label ?? 'Must be unique within this profile.'} />
        <Seg label="Operation type" value={d.operationType} onChange={(v) => { if (!busy) set('operationType', v); }}
          options={OPERATIONS.map((o) => [o, OP_LABELS[o]] as const)} />
        {fields.operationType ? <Text style={{ color: c.destructive, fontWeight: '800' }}>{fields.operationType}</Text> : null}
        {d.operationType === 'CUSTOM' ? (
          <TextField label="Custom operation description" value={d.customOperation} onChangeText={(t) => set('customOperation', t)} maxLength={80} editable={!busy}
            testID="profile-custom" hint={fields.customOperation} />
        ) : null}
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700', marginBottom: 8 }}>The type is a label only. It does not change the limits or imply an approval.</Text>
        <TextField label="Manual reference (optional)" value={d.manual} onChangeText={(t) => set('manual', t)} maxLength={500} editable={!busy} multiline
          testID="profile-manual" placeholder="Ops manual v4.1, part B section 2" hint={fields.manual ?? 'Where these figures come from.'} />
        <TextField label="Effective note (optional)" value={d.effectiveNote} onChangeText={(t) => set('effectiveNote', t)} maxLength={200} editable={!busy}
          testID="profile-effective" placeholder="Effective 1 Mar 2025" hint={fields.effectiveNote} />
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase' }}>Four limits</Text>
        {limit('maxHeightM', 'Max height AGL', 'metres')}
        {limit('peopleM', 'Distance from people', 'metres')}
        {limit('verticalFt', 'Crewed aircraft vertical', 'feet')}
        {limit('horizontalM', 'Crewed aircraft horizontal', 'metres')}
        <AircraftEditor list={d.aircraft} onChange={(next) => set('aircraft', next)} disabled={busy} onStagedChange={setAircraftStaged} />
        {fields.aircraft ? <Callout title="Aircraft" tone="danger">{fields.aircraft}</Callout> : null}
        {aircraftStaged ? <Callout title="Aircraft entry open">Add, update or clear the aircraft entry before saving the version.</Callout> : null}
        {error ? <Callout title="Not saved" tone="danger">{error}</Callout> : null}
        <ActionButton icon="check" label={busy ? 'Saving' : 'Save version'} onPress={save} disabled={busy || aircraftStaged} testID="profile-save" />
        <ActionButton secondary icon="x" label="Cancel and discard draft" onPress={onCancel} disabled={busy} testID="profile-cancel" />
      </View>
    </Panel>
  );
}
