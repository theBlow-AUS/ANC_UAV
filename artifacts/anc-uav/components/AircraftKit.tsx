import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { PixelRatio, Pressable, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, DISPLAY, Panel, SectionHeading, TextField } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { aircraftColumns, aircraftRows, formatMetres, NAME_MAX, SOURCE_MAX, validateDraft, type Aircraft, type AircraftDraft } from '@/lib/aircraft';
import { aircraftStore, useAircraft } from '@/lib/aircraft-store';

const GAP = 10;

/** Aviate: one tile per configured aircraft, rows measured from the real container width. */
export function AircraftTiles() {
  const c = useColors();
  const ui = useUi();
  const { aircraft, hydrated, loadError } = useAircraft();
  const [width, setWidth] = useState(0);
  const fontScale = ui.text * Math.max(1, PixelRatio.getFontScale());
  const cols = aircraftColumns({ width, tablet: ui.tablet, count: aircraft.length, fontScale, gap: GAP });
  const rows = aircraftRows(aircraft.length, cols);
  const big = ui.fs(cols >= 5 ? 34 : cols >= 3 ? 40 : 52);

  let start = 0;
  return (
    <View style={{ marginBottom: 12 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} testID="aircraft-tiles">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(24), textTransform: 'uppercase' }}>Aircraft distance from home point</Text>
        <Badge tone="warning">OPERATOR-CONFIGURED · UNVERIFIED</Badge>
      </View>
      {loadError ? <Callout title="Aircraft distances" tone="danger">{loadError}</Callout> : null}
      {!hydrated ? (
        <View style={{ height: ui.fs(110), backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: c.border, opacity: 0.6 }} />
      ) : aircraft.length === 0 ? (
        <Panel>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(26), textTransform: 'uppercase' }}>No aircraft configured</Text>
          <Text style={{ color: c.mutedForeground, fontSize: ui.fs(15), fontWeight: '700' }}>Add your aircraft and the distance from your operations manual in Settings.</Text>
          <ActionButton icon="settings" label="Add in Settings" onPress={() => router.navigate('/settings')} testID="aircraft-empty-settings" />
        </Panel>
      ) : width > 0 ? (
        rows.map((n, r) => {
          const items = aircraft.slice(start, start + n);
          start += n;
          return (
            <View key={r} style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
              {items.map((a) => (
                <View key={a.id} accessible accessibilityLabel={`${a.name}, ${formatMetres(a.distanceM)} metres, operator-configured, unverified`}
                  style={{ flex: 1, minWidth: 0, backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: c.signal, padding: 12, gap: 4 }}>
                  <Text style={{ color: c.foreground, fontSize: ui.fs(16), fontWeight: '800' }}>{a.name}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.25} style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: big, lineHeight: big * 1.05 }}>
                    {formatMetres(a.distanceM)}<Text style={{ fontSize: ui.fs(20) }}>{'\u00a0'}m</Text>
                  </Text>
                  {a.source ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(12), fontWeight: '700' }}>{a.source}</Text> : null}
                </View>
              ))}
            </View>
          );
        })
      ) : null}
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>
        Figures entered by your operator in Settings. Not manufacturer limits, not a VLOS guarantee, not a flight clearance.
      </Text>
    </View>
  );
}

const EMPTY: AircraftDraft = { name: '', distance: '', source: '' };

/** Settings: add, edit and confirmed removal. Drafts persist through failed saves. */
export function AircraftEditor() {
  const c = useColors();
  const ui = useUi();
  const { aircraft, hydrated, loadError, readBlocked } = useAircraft();
  const [draft, setDraft] = useState<AircraftDraft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const v = validateDraft(draft);
  const errs = !v.ok && touched ? v.errors : {};

  const save = async () => {
    setTouched(true); setNotice(null);
    if (!v.ok || busy) return;
    setBusy(true); setError(null);
    const res = editing ? await aircraftStore.update(editing, v.value) : await aircraftStore.add(v.value);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setNotice(editing ? `Saved changes to ${v.value.name}.` : `Added ${v.value.name}.`);
    setDraft(EMPTY); setEditing(null); setTouched(false);
  };

  const startEdit = (a: Aircraft) => {
    setEditing(a.id); setDraft({ name: a.name, distance: formatMetres(a.distanceM), source: a.source });
    setTouched(false); setError(null); setNotice(null); setConfirm(null);
  };
  const cancel = () => { setEditing(null); setDraft(EMPTY); setTouched(false); setError(null); };

  const remove = async (a: Aircraft) => {
    setBusy(true); setError(null); setNotice(null);
    const res = await aircraftStore.remove(a.id);
    setBusy(false); setConfirm(null);
    if (!res.ok) { setError(res.error.replace('your entry is still in the form', 'nothing was removed')); return; }
    if (editing === a.id) cancel();
    setNotice(`Removed ${a.name}.`);
  };

  return (
    <View testID="aircraft-editor">
      <SectionHeading title="Aircraft distances" detail="One Aviate tile per aircraft. Enter the distance from your operations manual. Stored only on this device." />
      <Badge tone="warning">OPERATOR-CONFIGURED · UNVERIFIED</Badge>
      <View style={{ height: 8 }} />
      {loadError ? <Callout title="Aircraft storage" tone="danger">{loadError}</Callout> : null}
      {readBlocked ? <ActionButton icon="refresh-cw" label={busy ? 'Reloading' : 'Reload saved aircraft'} disabled={busy} onPress={async () => {
        setBusy(true);
        try { await aircraftStore.reload(); } finally { setBusy(false); }
      }} testID="reload-aircraft" /> : null}
      {hydrated && aircraft.length === 0 ? (
        <Panel><Text style={{ color: c.foreground, fontSize: ui.fs(16), fontWeight: '800' }}>No aircraft saved. Aviate shows an empty state until you add one below.</Text></Panel>
      ) : null}
      {aircraft.map((a) => (
        <View key={a.id} style={{ backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: editing === a.id ? c.signal : c.ink, padding: 12, marginBottom: 10, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: c.foreground, fontSize: ui.fs(18), fontWeight: '800' }}>{a.name}</Text>
              <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(30) }}>{formatMetres(a.distanceM)}{'\u00a0'}m</Text>
              {a.source ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>Source note: {a.source}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`} testID={`edit-aircraft-${a.id}`} onPress={() => startEdit(a)} disabled={busy}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink }}>
              <Feather name="edit-2" size={22} color={c.foreground} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`} testID={`remove-aircraft-${a.id}`} onPress={() => setConfirm(confirm === a.id ? null : a.id)} disabled={busy}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.destructive }}>
              <Feather name="trash-2" size={22} color={c.destructive} />
            </Pressable>
          </View>
          {confirm === a.id ? (
            <View accessibilityRole="alert" style={{ borderTopWidth: 2, borderTopColor: c.border, paddingTop: 8, gap: 8 }}>
              <Text style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' }}>Remove {a.name} and its tile from Aviate?</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable accessibilityRole="button" testID={`confirm-remove-${a.id}`} onPress={() => remove(a)} disabled={busy}
                  style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.destructive, paddingHorizontal: 8 }}>
                  <Text style={{ color: c.destructiveForeground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>Remove</Text>
                </Pressable>
                <Pressable accessibilityRole="button" testID={`keep-${a.id}`} onPress={() => setConfirm(null)}
                  style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink, paddingHorizontal: 8 }}>
                  <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>Keep</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ))}
      <Panel>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase' }}>{editing ? 'Edit aircraft' : 'Add aircraft'}</Text>
        <TextField label="Aircraft name" value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} placeholder="Mini, M30T, Matrice 4/5T" maxLength={NAME_MAX} testID="aircraft-name" hint={errs.name} />
        <TextField label="Distance from home point (metres)" value={draft.distance} onChangeText={(t) => setDraft((d) => ({ ...d, distance: t }))} placeholder="500" keyboardType="decimal-pad" testID="aircraft-distance" hint={errs.distance ?? 'Metres. Decimals allowed.'} />
        <TextField label="Source / version note (optional)" value={draft.source} onChangeText={(t) => setDraft((d) => ({ ...d, source: t }))} placeholder="Ops manual v3.2, section 4" maxLength={SOURCE_MAX} testID="aircraft-source" hint="A note does not make the figure approved." />
        {errs.name || errs.distance ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontSize: ui.fs(14), fontWeight: '800' }}>Fix the highlighted fields before saving.</Text> : null}
        {error ? <Callout title="Not saved" tone="danger">{error}</Callout> : null}
        {notice && !error ? <Text accessibilityRole="alert" style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '800' }}>{notice}</Text> : null}
        <ActionButton icon={editing ? 'check' : 'plus'} label={busy ? 'Saving' : editing ? 'Save changes' : 'Add aircraft'} onPress={save} disabled={!hydrated || busy || readBlocked} testID="save-aircraft" />
        {editing ? <ActionButton secondary icon="x" label="Cancel edit" onPress={cancel} testID="cancel-aircraft" /> : null}
      </Panel>
    </View>
  );
}
