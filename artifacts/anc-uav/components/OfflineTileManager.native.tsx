import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { OfflinePack, OfflinePackStatus } from '@maplibre/maplibre-react-native';
import { hasMapLibreNative } from '../lib/maplibre-runtime';
import { OfflineTileManager as UnavailableDownloads } from './OfflineTileManager.web';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, SectionHeading, TextField } from './FieldKit';
import { useColors } from '../hooks/useColors';
import {
  AUSTRALIA_REGIONS, estimatedBytes, estimateTileCount, isValidTileBounds, mapStyle,
  TILE_LAYERS, type TileBounds, type TileLayerId,
} from '../lib/map-tiles';

const PREFERENCE_KEY = 'anc-uav.offline-map-view.v1';
const MAX_TILE_COUNT = 3000;
const MAX_OPENFREE_BYTES = 45 * 1024 * 1024;
const MAX_OTHER_BYTES = 220 * 1024 * 1024;
const ZOOM_CHOICES = [6, 8, 10, 12, 14];
type Props = {
  layer: TileLayerId; onLayerChange: (layer: TileLayerId) => void;
  satelliteDate: string; onSatelliteDateChange: (date: string) => void;
  currentBounds: TileBounds | null; initialBounds: TileBounds;
  onFocusBounds: (bounds: TileBounds) => void;
};
const blankBounds = { west: '', south: '', east: '', north: '' };
function prettyBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function dateYesterday() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function statusText(status?: OfflinePackStatus) {
  if (!status) return 'Saved on device';
  if (status.state === 'complete') return `Ready offline · ${status.completedTileCount.toLocaleString()} tiles`;
  if (status.state === 'active') return `Downloading · ${Math.round(status.percentage)}%`;
  return `Paused · ${status.completedTileCount.toLocaleString()} tiles`;
}

export function OfflineTileManager(props: Props) {
  return hasMapLibreNative() ? <NativeTileManager {...props} /> : <UnavailableDownloads {...props} />;
}

function NativeTileManager({
  layer, onLayerChange, satelliteDate, onSatelliteDateChange, currentBounds, initialBounds, onFocusBounds,
}: Props) {
  const { OfflineManager } =
    require('@maplibre/maplibre-react-native') as typeof import('@maplibre/maplibre-react-native');
  const colors = useColors();
  const [areaMode, setAreaMode] = useState<'view' | 'region' | 'custom'>('view');
  const [regionId, setRegionId] = useState('au');
  const [zoom, setZoom] = useState(8);
  const [custom, setCustom] = useState(blankBounds);
  const [packs, setPacks] = useState<OfflinePack[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OfflinePackStatus>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activePackId, setActivePackId] = useState<string | null>(null);

  const region = AUSTRALIA_REGIONS.find(r => r.id === regionId) ?? AUSTRALIA_REGIONS[0];
  const selectedBounds: TileBounds = areaMode === 'region'
    ? region.bounds
    : areaMode === 'view'
      ? currentBounds ?? initialBounds
      : {
          west: Number(custom.west), south: Number(custom.south),
          east: Number(custom.east), north: Number(custom.north),
        };
  const validBounds = areaMode !== 'custom' || Object.values(custom).every(v => v.trim() !== '');
  const count = validBounds && isValidTileBounds(selectedBounds) ? estimateTileCount(selectedBounds, Math.min(zoom, TILE_LAYERS[layer].maxZoom)) : 0;
  const estimate = estimatedBytes(layer, count);
  const withinPolicy = layer === 'openfreemap'
    ? count > 0 && count <= MAX_TILE_COUNT && estimate <= MAX_OPENFREE_BYTES
    : count > 0 && count <= MAX_TILE_COUNT && estimate <= MAX_OTHER_BYTES;
  const currentStyle = useMemo(() => mapStyle(layer, satelliteDate), [layer, satelliteDate]);

  async function refreshPacks() {
    try {
      const next = await OfflineManager.getPacks();
      setPacks(next);
      const states: Record<string, OfflinePackStatus> = {};
      await Promise.all(next.map(async p => {
        try { states[p.id] = await p.status(); } catch { /* Keep the pack visible if its status is temporarily unavailable. */ }
      }));
      setStatuses(states);
    } catch {
      setError('Offline map storage could not be read. Saved map packs were not changed.');
    }
  }
  useEffect(() => {
    void refreshPacks();
    AsyncStorage.getItem(PREFERENCE_KEY).then(raw => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (['openfreemap', 'topographic', 'satellite'].includes(saved.layer)) onLayerChange(saved.layer);
      if (typeof saved.satelliteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.satelliteDate)) onSatelliteDateChange(saved.satelliteDate);
    }).catch(() => setError('Map display preference could not be read. Existing downloaded maps are unchanged.'));
  // Initial preference hydration only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!activePackId) return;
    return () => OfflineManager.removeListener(activePackId);
  }, [activePackId]);
  function changeLayer(value: TileLayerId) {
    onLayerChange(value);
    const nextDate = value === 'satellite' ? (satelliteDate || dateYesterday()) : satelliteDate;
    if (value === 'satellite') onSatelliteDateChange(nextDate);
    void AsyncStorage.setItem(PREFERENCE_KEY, JSON.stringify({ layer: value, satelliteDate: nextDate })).catch(() => {
      setError('Map display preference could not be saved. The selection remains available for this session.');
    });
  }
  function chooseRegion(id: string) {
    setRegionId(id); setAreaMode('region');
    const item = AUSTRALIA_REGIONS.find(r => r.id === id);
    if (item) onFocusBounds(item.bounds);
  }
  function useCurrentView() {
    setAreaMode('view');
    onFocusBounds(currentBounds ?? initialBounds);
  }
  function parseCustom(): TileBounds | null {
    const b = { west: Number(custom.west), south: Number(custom.south), east: Number(custom.east), north: Number(custom.north) };
    return Object.values(custom).every(v => v.trim() !== '') && isValidTileBounds(b) ? b : null;
  }
  async function startDownload() {
    setError('');
    if (!withinPolicy) {
      setError(layer === 'openfreemap'
        ? 'This area exceeds OpenFreeMap’s 3,000-tile or 50 MB offline limit. Choose a smaller area or lower the maximum zoom.'
        : 'This area exceeds the 3,000-tile or 256 MB on-device safety limit. Choose a smaller area or lower the maximum zoom.');
      return;
    }
    const bounds = areaMode === 'custom' ? parseCustom() : selectedBounds;
    if (!bounds) { setError('Enter valid west, south, east and north coordinates.'); return; }
    if (!FileSystem.documentDirectory) { setError('Device-local map storage is unavailable.'); return; }
    setBusy(true);
    setActivePackId(null);
    try {
      const effectiveZoom = Math.min(zoom, TILE_LAYERS[layer].maxZoom);
      const styleUri = `${FileSystem.documentDirectory}anc-uav-map-style-${layer}-${satelliteDate}.json`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}anc-uav/`, { intermediates: true });
      if (typeof currentStyle === 'string') {
        // Provider style remains directly hosted by OpenFreeMap; no Replit service is involved.
      } else {
        await FileSystem.writeAsStringAsync(styleUri, JSON.stringify(currentStyle));
      }
      OfflineManager.setTileCountLimit(MAX_TILE_COUNT);
      const name = areaMode === 'region' ? region.label : areaMode === 'custom' ? 'Selected area' : 'Current map view';
      const metadata = {
        app: 'Aviate.Navigate.Communicate (ANC UAV)',
        layer, region: name, minZoom: 0, maxZoom: effectiveZoom, estimatedTiles: count,
        bounds, satelliteDate: layer === 'satellite' ? satelliteDate : null,
        attribution: TILE_LAYERS[layer].attribution,
      };
      const packStyle = typeof currentStyle === 'string' ? currentStyle : styleUri;
      const created = await OfflineManager.createPack({
        mapStyle: packStyle,
        minZoom: 0,
        maxZoom: effectiveZoom,
        bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
        metadata,
      }, (_pack, status) => {
        setStatuses(s => ({ ...s, [_pack.id]: status }));
        setPacks(current => current.some(p => p.id === _pack.id) ? current : [...current, _pack]);
        setActivePackId(_pack.id);
        const byteLimit = layer === 'openfreemap' ? MAX_OPENFREE_BYTES : MAX_OTHER_BYTES;
        if (status.completedResourceSize > byteLimit) {
          void _pack.pause();
          setError('The download reached the source/device size limit and was paused. Delete it or resume with a smaller area.');
        }
      }, (_pack, issue) => {
        setError(`Map download stopped: ${issue.message}`);
        setPacks(current => current.some(p => p.id === _pack.id) ? current : [...current, _pack]);
        setActivePackId(_pack.id);
      });
      setActivePackId(created.id);
      await refreshPacks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The map download could not be started.');
      await refreshPacks();
    } finally { setBusy(false); }
  }
  async function pausePack(pack: OfflinePack) {
    try { await pack.pause(); await refreshPacks(); } catch { setError('Could not pause this map download.'); }
  }
  async function resumePack(pack: OfflinePack) {
    try { setActivePackId(pack.id); await pack.resume(); await refreshPacks(); } catch { setError('Could not resume this map download.'); }
  }
  function deletePack(pack: OfflinePack) {
    const label = typeof pack.metadata.region === 'string' ? pack.metadata.region : 'this map';
    Alert.alert('Delete offline map?', `Remove ${label} from this device? This cannot be undone.`, [
      { text: 'Keep map', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void OfflineManager.deletePack(pack.id).then(refreshPacks).catch(() => setError('Could not delete the offline map; it remains listed.'));
      } },
    ]);
  }

  return <View style={{ gap: 12 }}>
    <SectionHeading title="Offline map downloads" detail="Choose a map layer, then download the current view, a region, or a coordinate area to this device." />
    <Panel>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 16 }}>Map layer</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(Object.keys(TILE_LAYERS) as TileLayerId[]).map(id =>
          <ActionButton key={id} label={TILE_LAYERS[id].label} secondary={layer !== id} onPress={() => changeLayer(id)} testID={`map-layer-${id}`} />)}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>{TILE_LAYERS[layer].notes}</Text>
      {layer === 'satellite' ? <Badge tone="warning">{`NASA browse imagery · dated ${satelliteDate} · coarse resolution`}</Badge> : null}
    </Panel>
    <Panel>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 16 }}>Download area</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <ActionButton label="Current map view" secondary={areaMode !== 'view'} onPress={useCurrentView} testID="download-current-view" />
        <ActionButton label="Preset region" secondary={areaMode !== 'region'} onPress={() => setAreaMode('region')} testID="download-preset-region" />
        <ActionButton label="Enter coordinates" secondary={areaMode !== 'custom'} onPress={() => setAreaMode('custom')} testID="download-custom-area" />
      </View>
      {areaMode === 'region' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {AUSTRALIA_REGIONS.map(r => <ActionButton key={r.id} label={r.label} secondary={regionId !== r.id} onPress={() => chooseRegion(r.id)} testID={`map-region-${r.id}`} />)}
      </View> : null}
      {areaMode === 'custom' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['west', 'south', 'east', 'north'] as const).map(key => <View key={key} style={{ flexGrow: 1, flexBasis: '44%' }}>
          <TextField label={`${key[0].toUpperCase()}${key.slice(1)} longitude/latitude`} value={custom[key]} onChangeText={value => setCustom(v => ({ ...v, [key]: value }))} keyboardType="numbers-and-punctuation" testID={`custom-map-${key}`} />
        </View>)}
      </View> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
        {isValidTileBounds(selectedBounds) && validBounds
          ? `${areaMode === 'region' ? region.label : areaMode === 'view' ? 'Current map view' : 'Custom area'} · ${selectedBounds.south.toFixed(3)} to ${selectedBounds.north.toFixed(3)} latitude · ${selectedBounds.west.toFixed(3)} to ${selectedBounds.east.toFixed(3)} longitude`
          : 'Enter a valid bounding box.'}
      </Text>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 15 }}>Maximum detail zoom</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ZOOM_CHOICES.filter(z => z <= TILE_LAYERS[layer].maxZoom).map(z =>
          <ActionButton key={z} label={`z${z}`} secondary={zoom !== z} onPress={() => setZoom(z)} testID={`map-zoom-choice-${z}`} />)}
      </View>
      <Badge tone={withinPolicy ? 'good' : 'warning'}>
        {`${count.toLocaleString()} estimated tiles · about ${prettyBytes(estimate)} · ${withinPolicy ? 'within download limits' : 'reduce area or zoom'}`}
      </Badge>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
        Estimates vary from actual download size. The app uses a 45 MB safety threshold for OpenFreeMap (provider cap 50 MB) and 220 MB for other sources, with MapLibre’s 3,000-tile device cap. Downloads contact the named provider directly, not Replit. Saved maps are stored by MapLibre on this device.
      </Text>
      <ActionButton label={busy ? 'Downloading…' : 'Download offline map'} icon="download" disabled={busy || !withinPolicy || (areaMode === 'custom' && !validBounds)} onPress={startDownload} testID="start-map-download" />
    </Panel>
    {error ? <Callout title="Map download status">{error}</Callout> : null}
    <Panel>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 16 }}>Saved offline maps</Text>
      {!packs.length ? <Text style={{ color: colors.mutedForeground }}>No offline map areas saved on this device yet.</Text> : null}
      {packs.map(pack => {
        const meta = pack.metadata ?? {};
        const title = typeof meta.region === 'string' ? meta.region : 'Offline map';
        const source = typeof meta.layer === 'string' && meta.layer in TILE_LAYERS ? TILE_LAYERS[meta.layer as TileLayerId].label : 'Map';
        const status = statuses[pack.id];
        const byteLimit = meta.layer === 'openfreemap' ? MAX_OPENFREE_BYTES : MAX_OTHER_BYTES;
        const tooLargeToResume = (status?.completedResourceSize ?? 0) > byteLimit;
        return <View key={pack.id} style={{ gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 9 }}>
          <Text style={{ color: colors.foreground, fontWeight: '800' }}>{title} · {source}</Text>
          <Badge tone={status?.state === 'complete' ? 'good' : 'warning'}>{statusText(status)}</Badge>
          {status?.state === 'active' ? <ActionButton label="Pause download" secondary onPress={() => void pausePack(pack)} /> : null}
          {status?.state === 'inactive' && !tooLargeToResume ? <ActionButton label="Resume download" secondary onPress={() => void resumePack(pack)} /> : null}
          {status?.state === 'inactive' && tooLargeToResume ? <Text style={{ color: colors.destructive, fontSize: 12 }}>This partial download exceeded its size limit and cannot be resumed. Delete it and choose a smaller area.</Text> : null}
          {status?.state !== 'active' ? <ActionButton label="Delete offline map" icon="trash-2" secondary onPress={() => deletePack(pack)} testID={`delete-offline-map-${pack.id}`} /> : null}
        </View>;
      })}
      <ActionButton label="Refresh saved maps" secondary onPress={() => void refreshPacks()} />
    </Panel>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
      © OpenMapTiles · © OpenStreetMap contributors · Geoscience Australia CC BY 4.0 · NASA EOSDIS GIBS. Preset regions use rectangular extents and can include neighbouring areas. Map tiles are reference-only and may be incomplete, outdated, cloud-obscured, or unavailable. They do not replace official aviation documents.
    </Text>
  </View>;
}
