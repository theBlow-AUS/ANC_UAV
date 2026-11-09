import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { PixelRatio, Pressable, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, DISPLAY, Panel, TextField } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { aircraftColumns, aircraftRows, formatMetres, MAX_AIRCRAFT, NAME_MAX, newAircraftId, SOURCE_MAX, validateDraft, type Aircraft, type AircraftDraft } from '@/lib/aircraft';

const GAP = 10;

/** Aviate: one tile per aircraft in the active saved profile version, rows measured from the real container width. */
export function AircraftTiles({ aircraft, onOpenSettings }: { aircraft: Aircraft[]; onOpenSettings: () => void }) {
  const c = useColors();
  const ui = useUi();
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
      {aircraft.length === 0 ? (
        <Panel>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(26), textTransform: 'uppercase' }}>No aircraft in this version</Text>
          <Text style={{ color: c.mutedForeground, fontSize: ui.fs(15), fontWeight: '700' }}>Edit the active profile version in Settings to add aircraft and the distance from your operations manual.</Text>
          <ActionButton icon="settings" label="Edit in Settings" onPress={onOpenSettings} testID="aircraft-empty-settings" />
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
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.25} style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: big, lineHeight: Math.ceil(big * 1.3), paddingTop: 2, paddingRight: 6, includeFontPadding: true }}>
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
        Figures from the active profile version, entered by your operator in Settings. Not manufacturer limits, not a VLOS guarantee, not a flight clearance.
      </Text>
    </View>
  );
}

const EMPTY: AircraftDraft = { name: '', distance: '', source: '' };

/** Controlled editor for the aircraft list inside a profile draft. Nothing is stored until the profile is saved. */
export function AircraftEditor({ list, onChange, disabled = false, onStagedChange }: {
  list: Aircraft[]; onChange: (next: Aircraft[]) => void; disabled?: boolean; onStagedChange?: (staged: boolean) => void;
}) {
  const c = useColors();
  const ui = useUi();
  const [draft, setDraft] = useState<AircraftDraft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const staged = editing !== null || !!(draft.name.trim() || draft.distance.trim() || draft.source.trim());
  const stagedRef = useRef(onStagedChange);
  stagedRef.current = onStagedChange;
  useEffect(() => { stagedRef.current?.(staged); }, [staged]);

  const v = validateDraft(draft);
  const errs = !v.ok && touched ? v.errors : {};
  const full = !editing && list.length >= MAX_AIRCRAFT;

  const apply = () => {
    setTouched(true); setNotice(null);
    if (!v.ok || disabled || full) return;
    if (editing) onChange(list.map((a) => (a.id === editing ? { ...v.value, id: editing } : a)));
    else onChange([...list, { ...v.value, id: newAircraftId() }]);
    setNotice(`${editing ? 'Updated' : 'Added'} ${v.value.name} in this draft. Save the profile version to keep it.`);
    setDraft(EMPTY); setEditing(null); setTouched(false);
  };
  const startEdit = (a: Aircraft) => {
    setEditing(a.id); setDraft({ name: a.name, distance: formatMetres(a.distanceM), source: a.source });
    setTouched(false); setNotice(null); setConfirm(null);
  };
  const cancel = () => { setEditing(null); setDraft(EMPTY); setTouched(false); };
  const remove = (a: Aircraft) => {
    onChange(list.filter((x) => x.id !== a.id));
    setConfirm(null);
    if (editing === a.id) cancel();
    setNotice(`Removed ${a.name} from this draft. Save the profile version to keep the change.`);
  };
  const lock = disabled || staged;

  return (
    <View testID="aircraft-editor" style={{ gap: 6 }}>
      <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase' }}>Aircraft distances (metres)</Text>
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>One Aviate tile per aircraft in this version. Changes here are staged until you save the profile version.</Text>
      <Badge tone="warning">OPERATOR-CONFIGURED · UNVERIFIED</Badge>
      {list.length === 0 ? <Text style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' }}>No aircraft in this draft. Aviate will show an empty aircraft state for this version.</Text> : null}
      {list.map((a) => (
        <View key={a.id} style={{ backgroundColor: c.background, borderLeftWidth: 8, borderLeftColor: editing === a.id ? c.signal : c.ink, padding: 10, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: c.foreground, fontSize: ui.fs(17), fontWeight: '800' }}>{a.name}</Text>
              <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(26) }}>{formatMetres(a.distanceM)}{'\u00a0'}m</Text>
              {a.source ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>Source note: {a.source}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`} accessibilityState={{ disabled: lock }} testID={`edit-aircraft-${a.id}`} onPress={() => startEdit(a)} disabled={lock}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink, opacity: lock ? 0.45 : 1 }}>
              <Feather name="edit-2" size={22} color={c.foreground} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`} accessibilityState={{ disabled: lock }} testID={`remove-aircraft-${a.id}`} onPress={() => setConfirm(confirm === a.id ? null : a.id)} disabled={lock}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.destructive, opacity: lock ? 0.45 : 1 }}>
              <Feather name="trash-2" size={22} color={c.destructive} />
            </Pressable>
          </View>
          {confirm === a.id ? (
            <View accessibilityRole="alert" style={{ borderTopWidth: 2, borderTopColor: c.border, paddingTop: 8, gap: 8 }}>
              <Text style={{ color: c.foreground, fontSize: ui.fs(15), fontWeight: '800' }}>Remove {a.name} from this draft? Its tile disappears from Aviate once the version is saved.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Pressable accessibilityRole="button" testID={`confirm-remove-${a.id}`} onPress={() => remove(a)} disabled={disabled}
                  style={{ flexGrow: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.destructive, paddingHorizontal: 12 }}>
                  <Text style={{ color: c.destructiveForeground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>Remove</Text>
                </Pressable>
                <Pressable accessibilityRole="button" testID={`keep-${a.id}`} onPress={() => setConfirm(null)}
                  style={{ flexGrow: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink, paddingHorizontal: 12 }}>
                  <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>Keep</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ))}
      <View style={{ borderWidth: 2, borderColor: c.border, padding: 10, gap: 2 }}>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>{editing ? 'Edit aircraft' : 'Add aircraft'}</Text>
        <TextField label="Aircraft name" value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} placeholder="Mini, M30T, Matrice 4/5T" maxLength={NAME_MAX} editable={!disabled} testID="aircraft-name" hint={errs.name} />
        <TextField label="Distance from home point (metres)" value={draft.distance} onChangeText={(t) => setDraft((d) => ({ ...d, distance: t }))} placeholder="500" keyboardType="decimal-pad" editable={!disabled} testID="aircraft-distance" hint={errs.distance ?? 'Metres. Decimals allowed.'} />
        <TextField label="Source / version note (optional)" value={draft.source} onChangeText={(t) => setDraft((d) => ({ ...d, source: t }))} placeholder="Ops manual v3.2, section 4" maxLength={SOURCE_MAX} editable={!disabled} testID="aircraft-source" hint="A note does not make the figure approved." />
        {full ? <Callout title="Aircraft limit" tone="danger">{`This version already has ${MAX_AIRCRAFT} aircraft. Remove one to add another.`}</Callout> : null}
        {errs.name || errs.distance ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontSize: ui.fs(14), fontWeight: '800', marginBottom: 6 }}>Fix the highlighted aircraft fields.</Text> : null}
        {notice ? <Text accessibilityRole="alert" style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '800', marginBottom: 6 }}>{notice}</Text> : null}
        <ActionButton secondary icon={editing ? 'check' : 'plus'} label={editing ? 'Update aircraft in draft' : 'Add aircraft to draft'} onPress={apply} disabled={disabled || full} testID="save-aircraft" />
        {staged ? <ActionButton secondary icon="x" label={editing ? 'Cancel aircraft edit' : 'Clear aircraft entry'} onPress={cancel} disabled={disabled} testID="cancel-aircraft" /> : null}
      </View>
    </View>
  );
}
