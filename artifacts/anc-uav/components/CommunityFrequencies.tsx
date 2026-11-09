import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { useColors } from '../hooks/useColors';
import { useUi } from '../hooks/useUi';
import { communityPage, searchCommunity, type CommunityResult, type FrequencyGroup } from '../lib/community-aviation';
import { communityStore, useCommunityAviation } from '../lib/community-store';
import { kmToNm, parseCoordinate } from '../lib/geo';
import { ActionButton, Badge, Callout, Panel, SectionHeading, Seg, TextField } from './FieldKit';

const GROUP_LABEL: Record<FrequencyGroup, string> = {
  ctaf: 'CTAF (explicit source record)',
  conditional: 'Conditional / unresolved CTAF',
  other: 'Other airport service',
};

export function Pager({ page, pages, total, onPage, label }: { page: number; pages: number; total: number; onPage: (p: number) => void; label: string }) {
  const c = useColors();
  const ui = useUi();
  if (total === 0) return null;
  return <View style={{ gap: 4, marginBottom: 8 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: c.foreground, fontWeight: '700', fontSize: ui.fs(14) }}>
      {label}: page {page + 1} of {pages} · {total} total
    </Text>
    {pages > 1 ? <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}><ActionButton label="Prev" icon="chevron-left" secondary disabled={page <= 0} onPress={() => onPage(page - 1)} /></View>
      <View style={{ flex: 1 }}><ActionButton label="Next" icon="chevron-right" secondary disabled={page >= pages - 1} onPress={() => onPage(page + 1)} /></View>
    </View> : null}
  </View>;
}

function ResultCard({ r, retrievedAt }: { r: CommunityResult; retrievedAt: string }) {
  const c = useColors();
  const ui = useUi();
  const [open, setOpen] = useState(false);
  const small = { color: c.mutedForeground, fontSize: ui.fs(13), lineHeight: ui.fs(19), fontWeight: '600' as const };
  const closed = r.airport.sourceType.toLowerCase() === 'closed';
  return <Panel>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Badge tone={r.group === 'ctaf' ? 'warning' : 'muted'}>{GROUP_LABEL[r.group]}</Badge>
      <Badge tone="warning">UNVERIFIED COMMUNITY DATA</Badge>
      {closed ? <Badge tone="danger">SOURCE SAYS CLOSED</Badge> : null}
    </View>
    <Text style={{ color: c.primary, fontSize: ui.fs(24), fontWeight: '800' }}>{r.frequency.frequencyMHz} MHz · {r.frequency.sourceType}</Text>
    <Text style={{ color: c.foreground, fontSize: ui.fs(16), fontWeight: '700' }}>{r.airport.name} ({r.airport.ident})</Text>
    <Text style={small}>Source description: {r.frequency.description || 'none given'}</Text>
    <Text style={{ ...small, color: c.foreground }}>
      {r.distanceKm === null ? 'Distance unknown: no origin set'
        : `${r.distanceKm.toFixed(1)} km / ${kmToNm(r.distanceKm).toFixed(1)} NM from origin · bearing ${r.bearingDegrees === null ? 'at origin' : `${Math.round(r.bearingDegrees).toString().padStart(3, '0')}° true`}`}
    </Text>
    <Text style={small}>Source airport type: {r.airport.sourceType} · tower/controlled status unknown · effective dates unknown</Text>
    <ActionButton label={open ? 'Hide source details' : 'Source details'} secondary icon={open ? 'chevron-up' : 'chevron-down'} onPress={() => setOpen(!open)} />
    {open ? <Text style={small}>
      Frequency record ID {r.frequency.id} · airport record ID {r.airport.id} · region {r.airport.region || 'not given'}
      {'\n'}Position {r.airport.position.latitude.toFixed(5)}, {r.airport.position.longitude.toFixed(5)}
      {'\n'}Publisher OurAirports · attribution OurAirports contributors · licence Public domain
      {'\n'}Source https://ourairports.com/data/ · snapshot retrieved {retrievedAt} (retrieval time, not an effective or verified date)
    </Text> : null}
  </Panel>;
}

export function CommunityFrequencies() {
  const c = useColors();
  const ui = useUi();
  const { snapshot, ready, busy, error, usingBundled, readBlocked } = useCommunityAviation();
  const { query, setQuery } = useNavigation();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState('50');
  const [group, setGroup] = useState<FrequencyGroup | 'all'>('all');
  const [page, setPage] = useState(0);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [originMsg, setOriginMsg] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [disclosed, setDisclosed] = useState(false);
  const small = { color: c.mutedForeground, fontSize: ui.fs(13), lineHeight: ui.fs(19), fontWeight: '600' as const };

  const origin = query.position;
  const radiusTrim = radius.trim();
  const radiusNum = Number(radiusTrim);
  const radiusError = origin && radiusTrim && (!Number.isFinite(radiusNum) || radiusNum <= 0)
    ? 'Invalid distance. Enter a number above 0, or clear the field to search all distances.' : '';
  const { rows, searchError } = useMemo(() => {
    if (radiusError) return { rows: [] as CommunityResult[], searchError: radiusError };
    try {
      return { rows: searchCommunity(snapshot, { origin, search, radiusKm: origin && radiusTrim ? radiusNum : null, group }), searchError: '' };
    } catch (e) {
      return { rows: [] as CommunityResult[], searchError: e instanceof Error ? e.message : 'Search failed.' };
    }
  }, [snapshot, origin, search, radiusTrim, radiusNum, group, radiusError]);
  const paged = useMemo(() => communityPage(rows, page), [rows, page]);
  const counts = useMemo(() => {
    const n = { ctaf: 0, conditional: 0, other: 0 };
    rows.forEach(r => { n[r.group]++; });
    return n;
  }, [rows]);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  function commitManual() {
    const p = parseCoordinate(lat, lon);
    if (!p) { setOriginMsg('Invalid coordinates. Origin unchanged. Use decimal degrees, latitude -90 to 90, longitude -180 to 180.'); return; }
    setQuery({ ...query, position: p }); setPage(0);
    setOriginMsg('Manual origin set.');
  }
  async function useGps() {
    setOriginMsg(''); setGpsBusy(true);
    try {
      let coords: { latitude: number; longitude: number };
      if (Platform.OS === 'web') {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        coords = pos.coords;
      } else {
        const perm = permission?.granted ? permission : await requestPermission();
        if (!perm.granted) {
          setOriginMsg(perm.canAskAgain ? 'Location permission not granted. Origin unchanged; enter coordinates manually.'
            : 'Location permission blocked in device settings. Origin unchanged; enter coordinates manually.');
          return;
        }
        coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords;
      }
      const p = parseCoordinate(String(coords.latitude), String(coords.longitude));
      if (!p) throw new Error();
      setQuery({ ...query, position: p }); setPage(0);
      setLat(p.latitude.toFixed(5)); setLon(p.longitude.toFixed(5));
      setOriginMsg('Device GPS origin set.');
    } catch {
      setOriginMsg('No device position available. Origin unchanged; enter coordinates manually.');
    } finally { setGpsBusy(false); }
  }

  return <>
    <SectionHeading title="Community airport frequencies" detail="OurAirports reference records. Discovery aid only, not applicability." />
    <Callout title="Unverified community data">
      {`Installed: ${snapshot.airports.length} Australian aerodromes, ${snapshot.frequencies.length} frequency records (${snapshot.rejectedAirports} aerodromes and ${snapshot.rejectedFrequencies} frequencies rejected as invalid). Coverage is partial and effective dates are unknown. Tower hours and controlled status are not known. No FCTAF is inferred. No result does NOT mean no radio requirement.`}
    </Callout>
    <Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge tone="warning">{usingBundled ? 'BUNDLED SNAPSHOT' : 'UPDATED SNAPSHOT ON DEVICE'}</Badge>
        {!ready ? <Badge>READING SAVED DATA</Badge> : null}
        {busy ? <Badge tone="warning">UPDATING · PREVIOUS DATA IN USE</Badge> : null}
      </View>
      <Text style={small}>Publisher {snapshot.publisher} · licence {snapshot.licence} · retrieved {snapshot.retrievedAt} · revision {snapshot.revision}</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontWeight: '700', fontSize: ui.fs(14) }}>{error}</Text> : null}
      {readBlocked ? <ActionButton label="Reload saved data" icon="refresh-ccw" secondary disabled={busy} onPress={() => void communityStore.reload()} /> : null}
      <ActionButton label={disclosed ? 'Hide update details' : 'Update from source'} icon="download-cloud" secondary onPress={() => setDisclosed(!disclosed)} />
      {disclosed ? <View style={{ gap: 6 }}>
        <Text style={small}>
          This update connects directly to GitHub (api.github.com and raw.githubusercontent.com) and downloads up to 28 MB of CSV data plus a small revision response. The two OurAirports CSV files are pinned to the same commit. No account, location or Replit service is involved; the hosts still receive ordinary connection details such as your IP address. Nothing downloads until you press the button below; there is no automatic refresh. The current snapshot stays active unless the full replacement validates.
        </Text>
        <ActionButton label={busy ? 'Updating' : 'Download and validate now'} icon="download" disabled={busy || readBlocked || !ready}
          onPress={() => void communityStore.refresh()} testID="community-refresh" />
        {readBlocked ? <Text style={{ color: c.destructive, fontSize: ui.fs(13) }}>Updates disabled until saved data reloads successfully.</Text> : null}
      </View> : null}
    </Panel>

    <Panel>
      <Text style={{ color: c.foreground, fontWeight: '700', fontSize: ui.fs(15) }}>
        Origin: {origin ? `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}` : 'NOT SET (name / ident search still works; no distances)'}
      </Text>
      <ActionButton label={gpsBusy ? 'Locating' : 'Use device GPS'} icon="crosshair" disabled={gpsBusy} onPress={() => void useGps()} testID="community-gps" />
      <View style={{ flexDirection: ui.tablet ? 'row' : 'column', gap: ui.tablet ? 10 : 0 }}>
        <View style={{ flex: 1 }}><TextField label="Manual latitude" value={lat} onChangeText={setLat} placeholder="-33.94610" keyboardType="numbers-and-punctuation" testID="community-lat" /></View>
        <View style={{ flex: 1 }}><TextField label="Manual longitude" value={lon} onChangeText={setLon} placeholder="151.17700" keyboardType="numbers-and-punctuation" testID="community-lon" /></View>
      </View>
      <ActionButton label="Set manual origin" icon="map-pin" secondary onPress={commitManual} testID="community-set-origin" />
      <ActionButton label="Open Map & Measure" icon="map" secondary onPress={() => router.navigate('/map')} />
      {originMsg ? <Text accessibilityLiveRegion="polite" style={{ color: c.foreground, fontWeight: '700', fontSize: ui.fs(13) }}>{originMsg}</Text> : null}
    </Panel>

    <Panel>
      <TextField label="Search aerodrome name or identifier" value={search} onChangeText={reset(setSearch)} placeholder="e.g. YSCN or Camden" autoCapitalize="characters" testID="community-search" />
      <TextField label="Discovery distance (km, origin only)" value={radius} onChangeText={reset(setRadius)} editable={!!origin}
        placeholder="Blank = all distances" keyboardType="decimal-pad" testID="community-radius"
        hint={origin ? 'Search filter only. It is not a radio service boundary.' : 'Ignored until an origin is set.'} />
      <Seg label="Show" value={group} onChange={reset(setGroup)}
        options={[['all', 'All'], ['ctaf', 'CTAF'], ['conditional', 'Cond.'], ['other', 'Other']] as const} />
      <Text style={small}>CTAF = explicit CTAF records · Cond. = conditional / unresolved CTAF (e.g. mixed TWR/CTAF) · Other = other airport services</Text>
      {searchError ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontWeight: '700', fontSize: ui.fs(14) }}>{searchError}</Text> : null}
      <Text style={{ ...small, color: c.foreground }}>{rows.length} matching records · CTAF {counts.ctaf} · Conditional {counts.conditional} · Other {counts.other}</Text>
    </Panel>

    {!searchError && !rows.length ? <Callout title="No matching community records">
      No records match this search. The dataset is incomplete; this does not mean no CTAF, clear airspace or no radio requirement.
    </Callout> : null}
    <Pager label="Community results" page={paged.page} pages={paged.pages} total={paged.total} onPage={setPage} />
    {paged.items.map(r => <ResultCard key={r.frequency.id} r={r} retrievedAt={snapshot.retrievedAt} />)}
    {paged.pages > 1 ? <Pager label="Community results" page={paged.page} pages={paged.pages} total={paged.total} onPage={setPage} /> : null}
  </>;
}
