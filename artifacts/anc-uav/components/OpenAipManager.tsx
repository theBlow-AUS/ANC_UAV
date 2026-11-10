import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useOpenAip } from '../context/OpenAipContext';
import { useColors } from '../hooks/useColors';
import { useUi } from '../hooks/useUi';
import {
  frequencyLabel, limitLabel, OPENAIP_EXPORTS, OPENAIP_LEGAL, OPENAIP_NOTICE,
  type OpenAipRecord, type OpenAipSource,
} from '../lib/openaip-data';
import { Accordion } from './Accordion';
import { ActionButton, Badge, Callout, DISPLAY, Divider } from './FieldKit';

const RESULT_LIMIT = 12;
const HIT_LIMIT = 10;

function bytes(n: number) {
  if (n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function recordTitle(r: OpenAipRecord) {
  return r.kind === 'airport' ? `${r.name}${r.icao ? ` (${r.icao})` : ''}` : r.name;
}
function recordSub(r: OpenAipRecord) {
  if (r.kind === 'airport') return `Airport · ${r.frequencies.length} freq`;
  return `Airspace${r.icaoClass === null ? '' : ` · ICAO class code ${r.icaoClass}`} · ${limitLabel(r.lowerLimit)} to ${limitLabel(r.upperLimit)}`;
}

function Small({ children, tone = 'muted', selectable = false }: { children: React.ReactNode; tone?: 'muted' | 'fg' | 'danger'; selectable?: boolean }) {
  const c = useColors();
  const ui = useUi();
  const color = tone === 'fg' ? c.foreground : tone === 'danger' ? c.destructive : c.mutedForeground;
  return <Text selectable={selectable} style={{ color, fontSize: ui.fs(13), lineHeight: ui.fs(19), fontWeight: '600' }}>{children}</Text>;
}

function Label({ children }: { children: string }) {
  const c = useColors();
  const ui = useUi();
  return <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(17), lineHeight: ui.fs(21), textTransform: 'uppercase', marginTop: 6 }}>{children}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  const ui = useUi();
  return <View style={[st.row, { flexDirection: ui.side ? 'row' : 'column' }]}>{children}</View>;
}
function Cell({ children }: { children: React.ReactNode }) {
  const ui = useUi();
  return <View style={ui.side ? st.cell : undefined}>{children}</View>;
}

function SourceLine({ s }: { s: OpenAipSource }) {
  return <Small selectable>
    {s.key === 'au_apt.json' ? 'Airports' : 'Airspaces'} · {bytes(s.bytes)} · source modified {s.modifiedAt}{'\n'}
    {OPENAIP_EXPORTS}{s.key}
  </Small>;
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  const ui = useUi();
  const [open, setOpen] = useState(false);
  return <View style={{ borderLeftWidth: 2, borderLeftColor: c.border, marginTop: 4 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(o => !o)}
      style={({ pressed }) => [st.disclosure, { opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={open ? 'chevron-down' : 'chevron-right'} size={18} color={c.foreground} />
      <Text style={{ color: c.foreground, fontWeight: '800', fontSize: ui.fs(14) }}>{title}</Text>
    </Pressable>
    {open ? <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>{children}</View> : null}
  </View>;
}

function RecordButton({ r, selected, onPress }: { r: OpenAipRecord; selected: boolean; onPress: () => void }) {
  const c = useColors();
  const ui = useUi();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${recordTitle(r)}, ${r.kind}`}
    onPress={onPress} testID={`openaip-record-${r.kind}-${r.id}`}
    style={({ pressed }) => [st.record, { borderColor: selected ? c.signal : c.border, backgroundColor: selected ? c.secondary : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
    <Feather name={r.kind === 'airport' ? 'map-pin' : 'hexagon'} size={18} color={c.foreground} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text numberOfLines={2} style={{ color: c.foreground, fontWeight: '800', fontSize: ui.fs(15) }}>{recordTitle(r)}</Text>
      <Text numberOfLines={2} style={{ color: c.mutedForeground, fontWeight: '600', fontSize: ui.fs(12) }}>{recordSub(r)}</Text>
    </View>
    {selected ? <Feather name="check" size={18} color={c.foreground} /> : null}
  </Pressable>;
}

function RecordDetails({ r }: { r: OpenAipRecord }) {
  return <View style={{ gap: 4 }}>
    <Small tone="fg" selectable>OpenAIP id {r.id} · source updated {r.updatedAt ?? 'not supplied'} · effective dates not supplied</Small>
    {r.kind === 'airport'
      ? <Small selectable>
          Position {r.position.latitude.toFixed(5)}, {r.position.longitude.toFixed(5)} · elevation {limitLabel(r.elevation)}
          {r.sourceType === null ? '' : ` · source type ${r.sourceType}`}
        </Small>
      : <>
          <Small tone="fg" selectable>Lower {limitLabel(r.lowerLimit)}{'\n'}Upper {limitLabel(r.upperLimit)}</Small>
          <Small selectable>
            {r.icaoClass === null ? 'ICAO class not supplied' : `ICAO class source code ${r.icaoClass}`}
            {r.sourceType === null ? '' : ` · source type ${r.sourceType}`} · {r.h24 ? 'Source schedule reads as H24' : 'Not confirmed H24'}
          </Small>
          {r.conditions.length ? <Small selectable>{r.conditions.join('\n')}</Small> : <Small>No source conditions flagged.</Small>}
          <Disclosure title="Raw source schedule">
            <Small selectable>{r.schedule}</Small>
          </Disclosure>
        </>}
    <Label>{`Frequencies (${r.frequencies.length})`}</Label>
    {r.frequencies.length
      ? r.frequencies.map((f, i) => <Small key={i} tone="fg" selectable>{frequencyLabel(f)}</Small>)
      : <Small>None supplied. Absence here is not evidence that no frequency applies.</Small>}
    {r.notes.length ? <><Label>Notes</Label>{r.notes.map((n, i) => <Small key={i} selectable>{n}</Small>)}</> : null}
  </View>;
}

/** Selected record + map-tap results. Lives outside the management accordion so it stays discoverable. */
function Inspector() {
  const o = useOpenAip();
  const c = useColors();
  const [showAll, setShowAll] = useState(false);
  if (!o.snapshot || (!o.selected && o.hits.length === 0)) return null;
  const shown = showAll ? o.hits : o.hits.slice(0, HIT_LIMIT);
  const airports = o.hits.filter(h => h.kind === 'airport').length;
  const spaces = o.hits.length - airports;
  return <View testID="openaip-inspector" style={[st.inspector, { backgroundColor: c.card, borderLeftColor: c.signal }]}>
    <View style={st.headRow}>
      <Feather name="crosshair" size={18} color={c.foreground} />
      <Text style={[st.h, { color: c.foreground }]}>OpenAIP at map point</Text>
    </View>
    {o.hits.length ? <>
      <Small>{airports} nearest airports (distance only, not applicability) · {spaces} airspace polygons containing the point in 2D, any altitude. Showing {shown.length} of {o.hits.length}.</Small>
      {shown.map(r => <RecordButton key={`${r.kind}-${r.id}`} r={r} selected={o.selected?.id === r.id && o.selected.kind === r.kind}
        onPress={() => o.selectRecord({ kind: r.kind, id: r.id })} />)}
      {o.hits.length > HIT_LIMIT ? <ActionButton secondary label={showAll ? 'Show fewer' : `Show all ${o.hits.length}`} onPress={() => setShowAll(v => !v)} /> : null}
      {spaces === 0 ? <Small>No containing polygon in this snapshot. That does not mean clear airspace.</Small> : null}
    </> : null}
    {o.selected ? <>
      <Divider />
      <Badge tone="warning">PUBLIC SNAPSHOT RECORD</Badge>
      <Text selectable style={[st.h, { color: c.foreground }]}>{recordTitle(o.selected)}</Text>
      <RecordDetails r={o.selected} />
      <Small>Snapshot retrieved {o.snapshot.retrievedAt}.</Small>
      {o.detail ? <>
        <Divider />
        <Badge tone="muted">CACHED API DETAIL · SEPARATE FROM SNAPSHOT</Badge>
        <Small tone="fg">Retrieved {o.detail.retrievedAt} via the OpenAIP API using a personal key. Not a currency check.</Small>
        <Small selectable>https://api.core.openaip.net/api/{o.detail.record.kind === 'airport' ? 'airports' : 'airspaces'}/{o.detail.record.id}</Small>
        <RecordDetails r={o.detail.record} />
      </> : null}
      {o.canDownload && (o.keyStatus === 'saved' || o.keyStatus === 'unknown')
        ? <ActionButton secondary icon="refresh-cw" label={o.detail ? 'Refresh API detail' : 'Fetch API detail'} disabled={o.busy || !o.ready}
            testID="openaip-refresh-detail" onPress={() => void o.refreshSelected()} />
        : <Small>API detail needs a saved personal key in the native app. It may return the same data and adds no entitlement.</Small>}
      <ActionButton secondary icon="x" label="Clear selection" disabled={o.busy} onPress={() => o.selectRecord(null)} />
    </> : null}
    <Small>{OPENAIP_NOTICE}</Small>
  </View>;
}

function KeySection() {
  const o = useOpenAip();
  const c = useColors();
  const ui = useUi();
  const [draft, setDraft] = useState('');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s !== 'active') setDraft(''); });
    return () => sub.remove();
  }, []);
  const native = o.canDownload && Platform.OS !== 'web';
  const statusText = {
    saved: 'Saved in protected device storage',
    none: 'No saved key recorded for this installation; protected entries can survive reinstall',
    unavailable: 'Protected storage unavailable (needs native build with enrolled device authentication)',
    unknown: 'Status unknown; a key may still be stored',
  }[o.keyStatus];
  const canSave = native && o.keyStatus !== 'unavailable';
  const canRemove = native;
  return <View style={{ gap: 6 }}>
    <Badge tone={o.keyStatus === 'saved' ? 'good' : o.keyStatus === 'none' ? 'muted' : 'warning'}>{`KEY: ${o.keyStatus.toUpperCase()}`}</Badge>
    <Small tone="fg">{statusText}.</Small>
    <Small>Optional. Public data works without a key. A key only enables header-authenticated detail refresh for a selected record; it may return the same data. It is never shown, copied, logged or sent when saved.</Small>
    {!native ? <Callout title="Native app only">Key storage is offered only in a native build with device authentication. Expo Go and web do not offer weaker storage.</Callout> : null}
    {canSave ? <>
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{o.keyStatus === 'saved' ? 'Replacement key' : 'Personal API key'}</Text>
      <TextInput value={draft} onChangeText={setDraft} secureTextEntry autoComplete="off" autoCorrect={false} autoCapitalize="none"
        spellCheck={false} textContentType="none" importantForAutofill="no" maxLength={512} accessibilityLabel="OpenAIP personal API key, masked"
        placeholder="Paste key" placeholderTextColor={c.mutedForeground} selectionColor={c.signal} editable={!o.busy} testID="openaip-key-input"
        style={[st.input, { borderColor: c.input, color: c.foreground, backgroundColor: c.background, fontSize: ui.fs(18) }]} />
      <ActionButton icon="lock" label={o.keyStatus === 'saved' ? 'Replace key' : 'Save key'} disabled={o.busy || !o.ready || draft.trim().length === 0}
        testID="openaip-save-key" onPress={() => { const k = draft.trim(); setDraft(''); void o.saveKey(k); }} />
    </> : null}
    {canRemove ? <ActionButton secondary icon="trash-2" label="Remove any saved key" disabled={o.busy || !o.ready} testID="openaip-remove-key"
      onPress={() => Alert.alert('Remove personal key?', 'Deletes the stored OpenAIP key from this device. Downloaded public data and cached details are kept.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove key', style: 'destructive', onPress: () => void o.removeKey() },
      ])} /> : null}
  </View>;
}

export function OpenAipManager() {
  const o = useOpenAip();
  const c = useColors();
  const ui = useUi();
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const snap = o.snapshot;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!snap || q.length < 2) return [] as OpenAipRecord[];
    const all: OpenAipRecord[] = [...snap.airports, ...snap.airspaces];
    return all.filter(r => r.name.toLowerCase().includes(q) || (r.kind === 'airport' && !!r.icao && r.icao.toLowerCase().includes(q)));
  }, [snap, query]);
  const shown = results.slice(0, showMore ? RESULT_LIMIT * 4 : RESULT_LIMIT);
  const removeData = () => Alert.alert('Remove downloaded OpenAIP data?',
    'Deletes the saved snapshot, any retained backup and the cached API details on this device. Your personal key, bundled references and other packs are not changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove data', style: 'destructive', onPress: () => void o.removeDownloads() },
    ]);
  const pct = o.progress?.total ? Math.min(1, o.progress.received / o.progress.total) : null;

  return <>
    {o.error ? <View accessibilityRole="alert" accessibilityLiveRegion="assertive"><Callout title="OpenAIP problem" tone="danger">{o.error}</Callout></View> : null}
    {o.message ? <View accessibilityRole="alert" accessibilityLiveRegion="polite"><Callout title="OpenAIP" tone="good">{o.message}</Callout></View> : null}
    <Inspector />
    <Accordion title="OpenAIP reference (AU)" icon="layers" testID="openaip-manager"
      summary={<>
        <Badge tone="warning">COMMUNITY DATA · NOT CLEARANCE</Badge>
        <Badge tone={snap ? 'good' : 'muted'}>{snap ? `${snap.airports.length} APT · ${snap.airspaces.length} ASP` : 'NOT DOWNLOADED'}</Badge>
        {o.busy ? <Badge tone="warning">WORKING</Badge> : null}
      </>}>
      {!o.ready ? <Small>Reading device storage...</Small> : null}
      <Small>{OPENAIP_NOTICE}</Small>
      <Row>
        <Cell>
          <Label>Public Australian data</Label>
          {o.canDownload
            ? <Small>Downloads the public AU airport and airspace exports. Nothing is fetched until you press a button. No key needed.</Small>
            : <Callout title="Native app only">The public export host does not allow browser cross-origin requests, so checking and downloading are available in the native app only.</Callout>}
          {snap ? <View style={{ gap: 4 }}>
            <Small tone="fg">Retrieved {snap.retrievedAt}. Effective dates: unknown (not supplied by source).</Small>
            {snap.sources.map(s => <SourceLine key={s.key} s={s} />)}
            <Small>Storage used {bytes(o.storedBytes)}, including any retained previous copy.</Small>
          </View> : <Small>No OpenAIP snapshot saved on this device.</Small>}
          {o.inventory ? <View style={{ gap: 4 }}>
            <Label>Published now</Label>
            {o.inventory.map(s => <SourceLine key={s.key} s={s} />)}
          </View> : null}
          {o.progress ? <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
            <Small tone="fg">{o.progress.phase} · {bytes(o.progress.received)}{o.progress.total ? ` of ${bytes(o.progress.total)}` : ''}</Small>
            <View style={[st.track, { backgroundColor: c.secondary }]}>
              <View style={[st.fill, { backgroundColor: c.signal, width: pct === null ? '100%' : `${Math.round(pct * 100)}%`, opacity: pct === null ? 0.4 : 1 }]} />
            </View>
          </View> : null}
          {o.canDownload ? <>
            <ActionButton secondary icon="search" label="Check versions" disabled={o.busy || !o.ready} testID="openaip-check" onPress={() => void o.checkUpdates()} />
            <ActionButton icon="download" label={snap ? 'Download and replace' : 'Download AU data'} disabled={o.busy || !o.ready} testID="openaip-download" onPress={() => void o.download()} />
          </> : null}
          {o.busy && o.cancellable ? <ActionButton secondary icon="x-circle" label="Cancel request" testID="openaip-cancel" onPress={o.cancel} /> : null}
          {snap && Platform.OS === 'ios' ? <>
            <ActionButton secondary icon="share" label="Share reference data" disabled={o.busy} testID="openaip-share-data" onPress={() => void o.shareDownloaded()} />
            <Small>Shares the public normalized JSON with its licence and attribution using the iOS share sheet. No key, incident notes or imported packs are included; the chosen app receives the file only if you complete sharing.</Small>
          </> : null}
          {o.canDownload && o.ready ? <ActionButton secondary icon="trash-2" label="Remove downloaded data" disabled={o.busy} testID="openaip-remove-data" onPress={removeData} /> : null}
          <Small selectable>Licence CC BY-NC 4.0 · {OPENAIP_LEGAL}</Small>
          <ActionButton secondary icon="external-link" label="Open licence & conditions" onPress={() => {
            void Linking.openURL(OPENAIP_LEGAL).catch(() => Alert.alert('Link unavailable', 'Open https://www.openaip.net/legal in your browser.'));
          }} />
        </Cell>
        <Cell>
          <Label>Map overlay</Label>
          <View style={st.switchRow}>
            <Text style={{ flex: 1, color: c.foreground, fontWeight: '700', fontSize: ui.fs(15) }}>Show OpenAIP layers on map</Text>
            <Switch value={o.visible} onValueChange={o.setVisible} disabled={!snap} accessibilityLabel="Show OpenAIP layers on map"
              trackColor={{ true: c.signal, false: c.secondary }} testID="openaip-visible" />
          </View>
          <Small>Tap the map to list nearby records. Not for primary navigation.</Small>
          <Label>Search</Label>
          <TextInput value={query} onChangeText={t => { setQuery(t); setShowMore(false); }} editable={!!snap} placeholder={snap ? 'Name or ICAO, 2+ characters' : 'Download data to search'}
            placeholderTextColor={c.mutedForeground} selectionColor={c.signal} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Search OpenAIP records"
            style={[st.input, { borderColor: c.input, color: c.foreground, backgroundColor: c.background, fontSize: ui.fs(17) }]} testID="openaip-search" />
          {snap && query.trim().length > 0 && query.trim().length < 2 ? <Small>Type at least 2 characters.</Small> : null}
          {snap && query.trim().length >= 2 ? <>
            <Small>Showing {shown.length} of {results.length} matches in this snapshot. The snapshot itself is partial.</Small>
            {shown.map(r => <RecordButton key={`${r.kind}-${r.id}`} r={r} selected={o.selected?.id === r.id && o.selected.kind === r.kind}
              onPress={() => o.selectRecord({ kind: r.kind, id: r.id })} />)}
            {results.length > RESULT_LIMIT && !showMore ? <ActionButton secondary label="Show more" onPress={() => setShowMore(true)} /> : null}
            {results.length > shown.length && showMore ? <Small>Refine the search to see the remaining {results.length - shown.length}.</Small> : null}
          </> : null}
        </Cell>
      </Row>
      <Divider />
      <Label>Personal API key</Label>
      <KeySection />
    </Accordion>
  </>;
}

const st = StyleSheet.create({
  row: { gap: 14 },
  cell: { flex: 1, minWidth: 0 },
  inspector: { borderLeftWidth: 4, padding: 12, gap: 6, marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h: { fontFamily: DISPLAY, fontWeight: '800', fontSize: 20, textTransform: 'uppercase' },
  record: { minHeight: 52, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  disclosure: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  input: { minHeight: 52, borderWidth: 3, paddingHorizontal: 12, fontWeight: '700', marginBottom: 8 },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: 8 },
  switchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
