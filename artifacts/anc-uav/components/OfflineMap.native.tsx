import { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import type { CameraRef, StyleSpecification } from '@maplibre/maplibre-react-native';
import { hasMapLibreNative } from '../lib/maplibre-runtime';
import { ReferenceMap } from './ReferenceMap';
import type { MapBounds, NavigationPack } from '../data/navigation-pack';
import type { Coordinate } from '../lib/geo';
import { mapStyle, type TileBounds, type TileLayerId } from '../lib/map-tiles';
import { useColors } from '../hooks/useColors';

type Props = {
  pack: NavigationPack; origin: Coordinate | null; destination: Coordinate | null;
  onSelect: (p: Coordinate) => void; layer?: TileLayerId; satelliteDate?: string;
  onBoundsChange?: (b: TileBounds) => void; focusBounds?: TileBounds | null;
};

export function OfflineMap(props: Props) {
  return hasMapLibreNative() ? <MapLibreMap {...props} /> : <ReferenceMap {...props} />;
}

function MapLibreMap({ pack, origin, destination, onSelect, layer = 'openfreemap', satelliteDate = '2026-11-08', onBoundsChange, focusBounds }: Props) {
  // Deliberately lazy: Expo Go does not contain MapLibre native modules.
  const { Camera, GeoJSONSource, Layer, Map: NativeMap } =
    require('@maplibre/maplibre-react-native') as typeof import('@maplibre/maplibre-react-native');
  const colors = useColors();
  const cameraRef = useRef<CameraRef>(null);
  const bounds = focusBounds ?? pack.bounds;
  const style = useMemo(() => mapStyle(layer, satelliteDate) as unknown as StyleSpecification, [layer, satelliteDate]);
  useEffect(() => {
    if (focusBounds) cameraRef.current?.fitBounds(
      [focusBounds.west, focusBounds.south, focusBounds.east, focusBounds.north],
      { padding: { top: 20, right: 20, bottom: 20, left: 20 }, duration: 350 },
    );
  }, [focusBounds]);
  const shape = useMemo(() => {
    const features: any[] = [];
    for (const ring of pack.land) {
      if (ring.length >= 3) {
        const closed = [...ring, ring[0]].map(p => [p.longitude, p.latitude] as [number, number]);
        features.push({ type: 'Feature', properties: { kind: 'airspace' }, geometry: { type: 'Polygon', coordinates: [closed] } });
      }
    }
    for (const p of pack.places) features.push({
      type: 'Feature', properties: { kind: p.kind, label: p.name },
      geometry: { type: 'Point', coordinates: [p.position.longitude, p.position.latitude] },
    });
    if (origin) features.push({ type: 'Feature', properties: { kind: 'origin', label: 'A' }, geometry: { type: 'Point', coordinates: [origin.longitude, origin.latitude] } });
    if (destination) features.push({ type: 'Feature', properties: { kind: 'destination', label: 'B' }, geometry: { type: 'Point', coordinates: [destination.longitude, destination.latitude] } });
    if (origin && destination) features.push({ type: 'Feature', properties: { kind: 'measure-line' }, geometry: { type: 'LineString', coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] } });
    return { type: 'FeatureCollection' as const, features };
  }, [pack, origin, destination]);
  const cameraBounds: MapBounds = { west: bounds.west, south: bounds.south, east: bounds.east, north: bounds.north };

  return <View style={{ gap: 8 }}>
    <View style={{ height: 360, borderRadius: 12, overflow: 'hidden' }} testID="offline-map">
      <NativeMap mapStyle={style} style={{ flex: 1 }} logo attribution
        onPress={e => onSelect({ longitude: e.nativeEvent.lngLat[0], latitude: e.nativeEvent.lngLat[1] })}
        onRegionDidChange={e => onBoundsChange?.({
          west: e.nativeEvent.bounds[0], south: e.nativeEvent.bounds[1],
          east: e.nativeEvent.bounds[2], north: e.nativeEvent.bounds[3],
        })}>
        <Camera ref={cameraRef}
          initialViewState={{ bounds: [cameraBounds.west, cameraBounds.south, cameraBounds.east, cameraBounds.north] }}
          minZoom={0} maxZoom={layer === 'satellite' ? 9 : 17} />
        <GeoJSONSource id="anc-operational-reference" data={shape}>
          <Layer id="anc-airspace-fill" type="fill" filter={['==', ['get', 'kind'], 'airspace']}
            paint={{ 'fill-color': colors.signal, 'fill-opacity': 0.12 }} />
          <Layer id="anc-airspace-outline" type="line" filter={['==', ['get', 'kind'], 'airspace']}
            paint={{ 'line-color': colors.signal, 'line-width': 1.4, 'line-dasharray': [2, 2] }} />
          <Layer id="anc-measure-line" type="line" filter={['==', ['get', 'kind'], 'measure-line']}
            paint={{ 'line-color': colors.destructive, 'line-width': 3, 'line-dasharray': [2, 2] }} />
          <Layer id="anc-reference-points" type="circle" filter={['in', ['get', 'kind'], ['literal', ['controlled', 'uncontrolled', 'aerodrome-unknown', 'locality']]]}
            paint={{ 'circle-radius': ['match', ['get', 'kind'], 'locality', 3, 5], 'circle-color': colors.foreground, 'circle-stroke-color': colors.background, 'circle-stroke-width': 1.5 }} />
          <Layer id="anc-point-labels" type="symbol" filter={['in', ['get', 'kind'], ['literal', ['controlled', 'uncontrolled', 'aerodrome-unknown']]]}
            layout={{ 'text-field': ['get', 'label'], 'text-size': 11, 'text-offset': [0, 1], 'text-anchor': 'top' }}
            paint={{ 'text-color': colors.foreground, 'text-halo-color': colors.background, 'text-halo-width': 1 }} />
          <Layer id="anc-measure-points" type="circle" filter={['in', ['get', 'kind'], ['literal', ['origin', 'destination']]]}
            paint={{ 'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'destination', colors.destructive, colors.foreground], 'circle-stroke-color': colors.background, 'circle-stroke-width': 2 }} />
          <Layer id="anc-measure-labels" type="symbol" filter={['in', ['get', 'kind'], ['literal', ['origin', 'destination']]]}
            layout={{ 'text-field': ['get', 'label'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top' }}
            paint={{ 'text-color': colors.foreground, 'text-halo-color': colors.background, 'text-halo-width': 1.5 }} />
        </GeoJSONSource>
      </NativeMap>
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Tap map to select WGS84 points. Tiles are reference imagery only; they are not an aeronautical chart or flight clearance.</Text>
  </View>;
}
