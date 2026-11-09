import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, Callout, DISPLAY } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { planImport, type ProfilesDoc, type TransferProfile } from '@/lib/operating-profiles';
import { pickProfileBackup, shareProfileBackup } from '@/lib/profile-transfer';
import { profileStore } from '@/lib/profile-store';

type Pending = { name: string; profiles: TransferProfile[]; revision: number; replace: string[]; activate: string | null };
const STATUS = { add: 'New', same: 'Identical, no change', conflict: 'Differs from saved version' } as const;

/** Backup export and previewed import. Replacement and activation are separate explicit choices; cancelling changes nothing. */
export function ProfileTransfer({ doc, disabled, onDone }: { doc: ProfilesDoc | null; disabled: boolean; onDone: (message: string) => void }) {
  const c = useColors();
  const ui = useUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const off = disabled || busy || !doc;
  const text = { color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' as const };

  const exportAll = async () => {
    if (!doc || busy) return;
    setBusy(true); setError(null);
    try { if ((await shareProfileBackup(doc)) === 'shared') onDone('Backup file created. It contains your ReOC profiles in plain text.'); }
    catch { setError('The backup could not be created or shared. Your profiles are unchanged.'); }
    finally { setBusy(false); }
  };
  const choose = async () => {
    if (!doc || busy) return;
    setBusy(true); setError(null);
    try {
      const picked = await pickProfileBackup();
      if (picked) setPending({ name: picked.name, profiles: picked.profiles, revision: doc.revision, replace: [], activate: null });
    } catch (e) { setError(`${e instanceof Error ? e.message : 'The file could not be read.'} Your saved profiles are unchanged.`); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    if (!pending || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await profileStore.importProfiles(pending.profiles, pending.revision, { replaceKeys: pending.replace, activateKey: pending.activate });
      if (!res.ok) { setError(res.error); return; }
      setPending(null);
      onDone(pending.activate ? 'Import complete. The version you chose is now in use on Aviate.' : 'Import complete. The selected version on Aviate was not changed.');
    } catch { setError('The import could not be saved. Your saved profiles are unchanged.'); }
    finally { setBusy(false); }
  };
  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]);
  const chip = (label: string, on: boolean, press: () => void, id: string) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on, disabled: busy }} testID={id} disabled={busy} onPress={press}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 3, borderColor: c.ink, backgroundColor: on ? c.ink : 'transparent' }}>
      <Text style={{ color: on ? c.background : c.foreground, fontWeight: '800', fontSize: ui.fs(14) }}>{label}</Text>
    </Pressable>
  );

  if (pending) {
    const plan = planImport(doc!, pending.profiles);
    const changes = plan.flatMap(p => p.versions).filter(v => v.status !== 'same').length;
    return (
      <View testID="import-preview" style={{ borderWidth: 2, borderColor: c.border, padding: 10, gap: 8, marginBottom: 12 }}>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(20), textTransform: 'uppercase' }}>Review import</Text>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>{`${pending.name}. Imported ReOC names, manual notes and labels are unverified declarations, not approval. Nothing is saved until you confirm.`}</Text>
        {plan.map(p => (
          <View key={p.index} style={{ gap: 4 }}>
            <Text style={text}>{`${p.reoc} · ${p.name} ${p.isNew ? '(new profile)' : '(existing profile)'}`}</Text>
            {p.versions.map(v => (
              <View key={v.key} style={{ borderLeftWidth: 4, borderLeftColor: c.border, paddingLeft: 8, gap: 4 }}>
                <Text style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '700' }}>
                  {`Version ${v.label} · ${STATUS[v.status]} · Height ${v.incoming.limits.maxHeightM} m, people ${v.incoming.limits.peopleM} m, vertical ${v.incoming.limits.verticalFt} ft, horizontal ${v.incoming.limits.horizontalM} m · ${v.incoming.aircraft.length} aircraft`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {v.status === 'conflict' ? chip(pending.replace.includes(v.key) ? 'Will replace saved version' : 'Keep saved version', pending.replace.includes(v.key),
                    () => setPending({ ...pending, replace: toggle(pending.replace, v.key) }), `replace-${v.key}`) : null}
                  {chip(pending.activate === v.key ? 'Will use on Aviate' : 'Use on Aviate after import', pending.activate === v.key,
                    () => setPending({ ...pending, activate: pending.activate === v.key ? null : v.key }), `activate-${v.key}`)}
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text style={text}>{changes === 0 && !pending.activate ? 'Everything in this file is already saved.' : 'Saved versions are kept unless you choose to replace them. The version in use changes only if you choose one above.'}</Text>
        {error ? <Callout title="Not imported" tone="danger">{error}</Callout> : null}
        <ActionButton icon="download" label={busy ? 'Importing' : 'Confirm import'} disabled={busy} testID="confirm-import" onPress={apply} />
        <ActionButton secondary icon="x" label="Cancel, change nothing" disabled={busy} testID="cancel-import" onPress={() => { setPending(null); setError(null); }} />
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 6 }}>
      {error ? <Callout title="Backup or import failed" tone="danger">{error}</Callout> : null}
      <ActionButton secondary icon="share" label="Export profiles backup" disabled={off} testID="export-profiles" onPress={exportAll} />
      <ActionButton secondary icon="folder" label="Import profiles from Files" disabled={off} testID="import-profiles" onPress={choose} />
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700', marginBottom: 8 }}>
        Backups are plain-text JSON with profiles, limits, aircraft and notes only. They are unencrypted and exclude the active selection, vault credentials, preferences and incident data.
      </Text>
    </View>
  );
}
