import { Text, View } from 'react-native';
import { Callout } from './FieldKit';
import type { TileBounds, TileLayerId } from '../lib/map-tiles';

export function OfflineTileManager(_props: {
  layer: TileLayerId; onLayerChange: (layer: TileLayerId) => void;
  satelliteDate: string; onSatelliteDateChange: (date: string) => void;
  currentBounds: TileBounds | null; initialBounds: TileBounds;
  onFocusBounds: (bounds: TileBounds) => void;
}) {
  return <View><Callout title="Offline downloads require a MapLibre-enabled app build">
    Expo Go and the browser preview cannot create native offline map packs. The local reference map remains available. Use an app build with MapLibre to download map areas to device storage.
  </Callout><Text /></View>;
}
