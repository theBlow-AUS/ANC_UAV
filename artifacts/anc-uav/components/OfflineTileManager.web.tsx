import { Text, View } from 'react-native';
import { Callout } from './FieldKit';
import type { TileBounds, TileLayerId } from '../lib/map-tiles';

export function OfflineTileManager(_props: {
  layer: TileLayerId; onLayerChange: (layer: TileLayerId) => void;
  satelliteDate: string; onSatelliteDateChange: (date: string) => void;
  currentBounds: TileBounds | null; initialBounds: TileBounds;
  onFocusBounds: (bounds: TileBounds) => void;
}) {
  return <View><Callout title="Offline map downloads require the installed iOS or Android app">
    The browser preview cannot create native MapLibre offline packs. Use the native app build to download map areas to device storage.
  </Callout><Text /></View>;
}
