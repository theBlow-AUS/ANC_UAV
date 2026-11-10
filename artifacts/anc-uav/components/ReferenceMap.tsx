import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import type { MapBounds, NavigationPack } from '../data/navigation-pack';
import { useColors } from '../hooks/useColors';
import type { Coordinate } from '../lib/geo';
import { coordinateToMap, insideBounds, mapToCoordinate } from '../lib/navigation';
import { ActionButton } from './FieldKit';
import type { TileBounds, TileLayerId } from '../lib/map-tiles';

type Props = {
  pack: NavigationPack; origin: Coordinate | null; destination: Coordinate | null;
  onSelect: (p: Coordinate) => void; layer?: TileLayerId; satelliteDate?: string;
  onBoundsChange?: (bounds: TileBounds) => void; focusBounds?: TileBounds | null;
};

/** Local schematic fallback for browser previews and native builds without MapLibre. */
export function ReferenceMap({ pack, origin, destination, onSelect, onBoundsChange, focusBounds, layer = 'openfreemap' }: Props) {
  const colors = useColors();
  const [width, setWidth] = useState(320);
  const [viewport, setViewport] = useState<MapBounds | null>(null);
  const bounds = viewport ?? focusBounds ?? pack.bounds;
  useEffect(() => { onBoundsChange?.(bounds); }, [bounds, onBoundsChange]);
  const height = Math.max(240, Math.min(420, width * (bounds.north - bounds.south) /
    ((bounds.east - bounds.west) * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180))));
  const project = (p: Coordinate) => coordinateToMap(p, bounds, width, height);
  const visiblePlaces = pack.places.filter(p => insideBounds(p.position, bounds));
  function zoom(factor: number) {
    const centre = origin && insideBounds(origin, bounds) ? origin : mapToCoordinate(width / 2, height / 2, bounds, width, height);
    const dx = Math.min(pack.bounds.east - pack.bounds.west, Math.max(.002, (bounds.east - bounds.west) * factor));
    const dy = Math.min(pack.bounds.north - pack.bounds.south, Math.max(.002, (bounds.north - bounds.south) * factor));
    const west = Math.max(pack.bounds.west, Math.min(pack.bounds.east - dx, centre.longitude - dx / 2));
    const south = Math.max(pack.bounds.south, Math.min(pack.bounds.north - dy, centre.latitude - dy / 2));
    setViewport({ west, east: west + dx, south, north: south + dy });
  }
  function pan(x: number, y: number) {
    const dx = bounds.east - bounds.west, dy = bounds.north - bounds.south;
    const west = Math.max(pack.bounds.west, Math.min(pack.bounds.east - dx, bounds.west + x * dx / 3));
    const south = Math.max(pack.bounds.south, Math.min(pack.bounds.north - dy, bounds.south + y * dy / 3));
    setViewport({ west, east: west + dx, south, north: south + dy });
  }
  const a = origin ? project(origin) : null, b = destination ? project(destination) : null;
  return <View style={styles.container}>
    <View testID="offline-map" accessibilityLabel="Offline reference map. Tap to select a WGS84 point."
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderRelease={e => {
        const { locationX, locationY } = e.nativeEvent;
        if (locationX >= 0 && locationX <= width && locationY >= 0 && locationY <= height)
          onSelect(mapToCoordinate(locationX, locationY, bounds, width, height));
      }}
      style={[styles.canvas, { height, backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Svg width={width} height={height} pointerEvents="none">
        {pack.land.map((ring, i) => <Polygon key={i} points={ring.map(p => { const q = project(p); return `${q.x},${q.y}`; }).join(' ')}
          fill={colors.secondary} stroke={colors.mutedForeground} strokeWidth={1} />)}
        {[.25, .5, .75].map(t => <Line key={`x${t}`} x1={width * t} x2={width * t} y1={0} y2={height} stroke={colors.border} strokeDasharray="3 5" />)}
        {[.25, .5, .75].map(t => <Line key={`y${t}`} y1={height * t} y2={height * t} x1={0} x2={width} stroke={colors.border} strokeDasharray="3 5" />)}
        {visiblePlaces.map(p => {
          const point = project(p.position);
          return <Circle key={p.id} cx={point.x} cy={point.y} r={p.kind === 'locality' ? 2 : 4}
            fill={p.kind === 'locality' ? colors.mutedForeground : colors.primary} />;
        })}
        {visiblePlaces.length <= 12 ? visiblePlaces.map(p => {
          const point = project(p.position);
          return <SvgText key={p.id} x={point.x + 5} y={point.y - 5} fontSize={11} fill={colors.foreground}>{p.name}</SvgText>;
        }) : null}
        {a && b ? <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.primary} strokeWidth={2} strokeDasharray="5 3" /> : null}
        {a ? <><Circle cx={a.x} cy={a.y} r={6} fill={colors.primary} /><SvgText x={a.x + 8} y={a.y} fill={colors.foreground}>A</SvgText></> : null}
        {b ? <><Circle cx={b.x} cy={b.y} r={6} fill={colors.destructive} /><SvgText x={b.x + 8} y={b.y} fill={colors.foreground}>B</SvgText></> : null}
        <SvgText x={8} y={18} fill={colors.foreground} fontSize={12}>N ↑ · WGS84</SvgText>
      </Svg>
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
      {bounds.north.toFixed(4)}° N edge · {bounds.south.toFixed(4)}° S edge · {bounds.west.toFixed(4)}° to {bounds.east.toFixed(4)}°
    </Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
      Schematic reference only. The selected {layer === 'openfreemap' ? 'OpenStreetMap' : layer === 'topographic' ? 'topographic' : 'satellite'} layer requires an app build with MapLibre; it is unavailable in Expo Go and the browser preview.
    </Text>
    <View style={styles.row}>
      <ActionButton label="Zoom in" onPress={() => zoom(.5)} testID="map-zoom-in" secondary />
      <ActionButton label="Zoom out" onPress={() => zoom(2)} secondary />
      <ActionButton label="Reset" onPress={() => setViewport(pack.bounds)} secondary />
    </View>
    <View style={styles.row}>
      <ActionButton label="West" onPress={() => pan(-1, 0)} secondary />
      <ActionButton label="North" onPress={() => pan(0, 1)} secondary />
      <ActionButton label="South" onPress={() => pan(0, -1)} secondary />
      <ActionButton label="East" onPress={() => pan(1, 0)} secondary />
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
      Flat reference projection; line is a visual connector, not a flight route. Distance and initial true bearing are calculated geodesically. No terrain or obstacle clearance.
    </Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 10 }, canvas: { overflow: 'hidden', borderWidth: 1, borderRadius: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
