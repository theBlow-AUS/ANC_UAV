import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, DISPLAY, Panel, SectionHeading } from '@/components/FieldKit';
import { operationText } from '@/components/ActiveProfile';
import { ProfileForm, type FormMode } from '@/components/ProfileForm';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { formatMetres } from '@/lib/aircraft';
import { findVersion, starterDraft, toDraft, type OperatingProfile, type ProfileDraft, type ProfileVersion, type SaveTarget } from '@/lib/operating-profiles';
import { profileStore, useProfiles, type ProfileResult } from '@/lib/profile-store';

type Editing = { key: number; mode: FormMode; draft: ProfileDraft; target?: SaveTarget; versionCount: number };
type Confirm = { kind: 'version' | 'profile' | 'reset'; id: string } | null;

/** Settings: operating profiles grouped by operator / ReOC. One open form at a time; list actions lock while editing or busy. */
export function ProfileManager() {
  const c = useColors();
  const ui = useUi();
  const { doc, hydrated, readBlocked, error } = useProfiles();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const active = findVersion(doc, doc?.activeVersionId ?? null);
  const profiles = doc?.profiles ?? [];
  const reocs = Array.from(new Set(profiles.map((p) => p.reoc))).sort((a, b) => a.localeCompare(b));
  const locked = busy || !!editing || readBlocked || !doc;

  const run = async (op: () => Promise<ProfileResult>, success: string) => {
    if (busy) return;
    setBusy(true); setFailure(null); setNotice(null);
    try {
      const res = await op();
      if (!res.ok) { setFailure(res.error); return; }
      setConfirm(null);
      setNotice(success);
    } catch {
      setFailure('The change could not be saved. Your saved profiles are unchanged.');
    } finally {
      setBusy(false);
    }
  };
  const reload = async () => {
    setBusy(true); setFailure(null);
    try { await profileStore.reload(); } finally { setBusy(false); }
  };
  const startForm = (mode: FormMode, draft: ProfileDraft, target?: SaveTarget, versionCount = 1) => {
    setConfirm(null); setFailure(null); setNotice(null);
    setEditing({ key: Date.now(), mode, draft, target, versionCount });
  };
  const rev = doc?.revision ?? 0;

  const versionRow = (p: OperatingProfile, v: ProfileVersion) => {
    const isActive = doc?.activeVersionId === v.id;
    const ask = confirm && confirm.id === v.id ? confirm.kind : null;
    return (
      <View key={v.id} testID={`version-${v.id}`} style={{ borderLeftWidth: 6, borderLeftColor: isActive ? c.signal : c.border, backgroundColor: c.background, padding: 10, gap: 6, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase' }}>Version {v.label}</Text>
          <Badge>{operationText(v)}</Badge>
          {isActive ? <Badge tone="warning">IN USE ON AVIATE</Badge> : null}
        </View>
        <Text style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' }}>
          {`Height ${formatMetres(v.limits.maxHeightM)} m · People ${formatMetres(v.limits.peopleM)} m · Crewed vertical ${formatMetres(v.limits.verticalFt)} ft · Crewed horizontal ${formatMetres(v.limits.horizontalM)} m · ${v.aircraft.length} aircraft`}
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>
          {v.manual ? `Manual: ${v.manual}` : 'No manual reference entered.'}{v.effectiveNote ? ` · Effective: ${v.effectiveNote}` : ''}
        </Text>
        {isActive
          ? <ActionButton secondary icon="slash" label="Stop using" disabled={locked} testID={`deselect-${v.id}`}
              onPress={() => run(() => profileStore.select(null), 'No profile is in use. Aviate shows no limits until you choose one.')} />
          : <ActionButton icon="check-circle" label="Use version" disabled={locked} testID={`use-${v.id}`}
              onPress={() => run(() => profileStore.select(v.id), `Aviate now shows ${p.name} version ${v.label}.`)} />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([
            ['edit-2', 'Edit', () => startForm('edit', toDraft(p, v), { profileId: p.id, versionId: v.id, expectedRevision: rev }, p.versions.length), `edit-${v.id}`],
            ['copy', 'Duplicate as new profile', () => startForm('duplicate', { ...toDraft(p, v), name: `${p.name} copy`.slice(0, 80) }), `duplicate-${v.id}`],
            ['rotate-ccw', 'Restore defaults', () => setConfirm(ask === 'reset' ? null : { kind: 'reset', id: v.id }), `reset-${v.id}`],
            ['trash-2', 'Delete version', () => setConfirm(ask === 'version' ? null : { kind: 'version', id: v.id }), `delete-version-${v.id}`],
          ] as const).map(([icon, label, onPress, id]) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label}, ${p.name} version ${v.label}`} accessibilityState={{ disabled: locked }}
              disabled={locked} onPress={onPress} testID={id}
              style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 3, borderColor: icon === 'trash-2' ? c.destructive : c.ink, opacity: locked ? 0.45 : 1 }}>
              <Feather name={icon} size={18} color={icon === 'trash-2' ? c.destructive : c.foreground} />
              <Text style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '800' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {ask === 'reset' ? confirmBox(
          `Restore version ${v.label} to the starter figures (120 m, 30 m, 500 ft, 1500 m) and starter aircraft? The manual reference and effective note are cleared so these figures are not attributed to your manual.${isActive ? ' This version is in use, so Aviate changes immediately.' : ''}`,
          'Restore defaults', () => run(() => profileStore.reset(v.id, rev), `Restored starter figures in ${p.name} version ${v.label}.`), `confirm-reset-${v.id}`)
          : null}
        {ask === 'version' ? confirmBox(
          `Delete ${p.name} version ${v.label}?${p.versions.length === 1 ? ' It is the only version, so the profile is deleted too.' : ''}${isActive ? ' It is in use: Aviate will show no limits until you choose another version.' : ''}`,
          'Delete version', () => run(() => profileStore.removeVersion(v.id), `Deleted ${p.name} version ${v.label}.`), `confirm-delete-version-${v.id}`)
          : null}
      </View>
    );
  };

  const confirmBox = (text: string, action: string, onYes: () => void, id: string) => (
    <View accessibilityRole="alert" style={{ borderTopWidth: 2, borderTopColor: c.border, paddingTop: 8, gap: 8 }}>
      <Text style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' }}>{text}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} testID={id} onPress={onYes} disabled={busy}
          style={{ flexGrow: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.destructive, paddingHorizontal: 12, opacity: busy ? 0.45 : 1 }}>
          <Text style={{ color: c.destructiveForeground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>{busy ? 'Working' : action}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" testID={`${id}-keep`} onPress={() => setConfirm(null)} disabled={busy}
          style={{ flexGrow: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink, paddingHorizontal: 12 }}>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>Keep</Text>
        </Pressable>
      </View>
    </View>
  );

  const profileBlock = (p: OperatingProfile) => {
    const isOpen = expanded === p.id;
    const hasActive = p.versions.some((v) => v.id === doc?.activeVersionId);
    return (
      <View key={p.id} style={{ borderWidth: 2, borderColor: hasActive ? c.signal : c.border, marginBottom: 10 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${p.name}, ${p.versions.length} versions${hasActive ? ', in use' : ''}`}
          testID={`profile-${p.id}`} onPress={() => setExpanded(isOpen ? null : p.id)}
          style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: c.foreground, fontSize: ui.fs(18), fontWeight: '800' }}>{p.name}</Text>
            <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>{`${p.versions.length} version${p.versions.length === 1 ? '' : 's'}${hasActive ? ' · one in use' : ''}`}</Text>
          </View>
          <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color={c.foreground} />
        </Pressable>
        {isOpen ? (
          <View style={{ paddingHorizontal: 10, paddingBottom: 4 }}>
            {p.versions.map((v) => versionRow(p, v))}
            <ActionButton secondary icon="plus" label="Add new version" disabled={locked} testID={`add-version-${p.id}`}
              onPress={() => startForm('version', { ...toDraft(p, p.versions[p.versions.length - 1]), label: '' }, { profileId: p.id, expectedRevision: rev }, p.versions.length)} />
            <ActionButton secondary icon="trash-2" label="Delete whole profile" disabled={locked} testID={`delete-profile-${p.id}`}
              onPress={() => setConfirm(confirm?.kind === 'profile' && confirm.id === p.id ? null : { kind: 'profile', id: p.id })} />
            {confirm?.kind === 'profile' && confirm.id === p.id ? confirmBox(
              `Delete ${p.name} and all ${p.versions.length} of its versions?${hasActive ? ' One is in use: Aviate will show no limits until you choose another version.' : ''}`,
              'Delete profile', () => run(() => profileStore.removeProfile(p.id), `Deleted ${p.name}.`), `confirm-delete-profile-${p.id}`)
              : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View testID="profile-manager">
      <SectionHeading title="Operating profiles" detail="Your operator's manual limits and aircraft, grouped by operator / ReOC. Stored only on this device." />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled: busy || !!editing }} accessibilityLabel={open ? 'Hide operating profiles' : 'Manage operating profiles'}
        testID="toggle-profiles" disabled={busy || !!editing} onPress={() => setOpen(!open)}
        style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: c.ink, padding: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '800' }}>IN USE ON AVIATE</Text>
          <Text style={{ color: c.foreground, fontSize: ui.fs(17), fontWeight: '800' }}>
            {!hydrated ? 'Loading' : readBlocked ? 'Profiles could not load' : active ? `${active.profile.reoc} · ${active.profile.name} · version ${active.version.label}` : 'None selected'}
          </Text>
        </View>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(18), textTransform: 'uppercase' }}>{open ? 'Hide' : 'Manage'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={24} color={c.foreground} />
      </Pressable>
      {open ? (
        <View>
          <Badge tone="warning">OPERATOR-CONFIGURED · UNVERIFIED</Badge>
          <View style={{ height: 8 }} />
          {readBlocked ? (
            <>
              <Callout title="Profiles storage" tone="danger">{error ?? 'Saved profiles could not be loaded.'}</Callout>
              <ActionButton icon="refresh-cw" label={busy ? 'Reloading' : 'Reload saved profiles'} disabled={busy} onPress={reload} testID="reload-profiles" />
            </>
          ) : null}
          {failure ? <Callout title="Not saved" tone="danger">{failure}</Callout> : null}
          {notice && !failure ? <Text accessibilityRole="alert" style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800', marginBottom: 10 }}>{notice}</Text> : null}
          {editing ? (
            <ProfileForm key={editing.key} mode={editing.mode} initial={editing.draft} target={editing.target} reocOptions={reocs} versionCount={editing.versionCount}
              onSaved={(m) => { setEditing(null); setNotice(m); }} onCancel={() => setEditing(null)} />
          ) : (
            <ActionButton icon="plus" label="New profile from starter" disabled={locked} testID="new-profile"
              onPress={() => startForm('new', { ...starterDraft(), reoc: '', name: '', label: '1' })} />
          )}
          {editing ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700', marginBottom: 8 }}>Other profile actions are locked while this draft is open.</Text> : null}
          {hydrated && !readBlocked && profiles.length === 0 ? (
            <Panel><Text style={{ color: c.foreground, fontSize: ui.fs(16), fontWeight: '800' }}>No profiles saved. Aviate shows no limits until you create one and press Use version.</Text></Panel>
          ) : null}
          {reocs.map((r) => (
            <View key={r} style={{ marginBottom: 6 }}>
              <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase', marginBottom: 6 }}>{r}</Text>
              {profiles.filter((p) => p.reoc === r).map(profileBlock)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
