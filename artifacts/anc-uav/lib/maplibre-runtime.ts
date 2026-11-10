import Constants, { ExecutionEnvironment } from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

// Importing MapLibre itself calls getEnforcing, so probe without importing it.
export function hasMapLibreNative(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return [
    'MLRNCameraModule', 'MLRNMapViewModule', 'MLRNOfflineModule',
    'MLRNLocationModule', 'MLRNNetworkModule', 'MLRNLogModule',
    'MLRNStaticMapModule', 'MLRNTransformRequestModule',
    'MLRNGeoJSONSourceModule', 'MLRNVectorSourceModule',
  ].every(name => TurboModuleRegistry.get(name) != null);
}
