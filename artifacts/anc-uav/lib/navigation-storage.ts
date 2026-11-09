import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { parseNavigationPack, type NavigationPack } from '../data/navigation-pack';

export const MAX_NAVIGATION_BYTES = 8 * 1024 * 1024;

export async function pickNavigationPack(): Promise<NavigationPack | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'], multiple: false, copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  try {
    if (asset.size === undefined || asset.size > MAX_NAVIGATION_BYTES)
      throw new Error('Choose a navigation JSON pack up to 8 MB with a reported file size.');
    let raw: string;
    if (Platform.OS === 'web') {
      if (!asset.file) throw new Error('The browser did not supply a readable local file.');
      raw = await asset.file.text();
    } else {
      raw = await FileSystem.readAsStringAsync(asset.uri);
    }
    if (raw.length > MAX_NAVIGATION_BYTES) throw new Error('Navigation pack exceeds the 8 MB limit.');
    return parseNavigationPack(JSON.parse(raw) as unknown);
  } finally {
    if (Platform.OS !== 'web') await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined);
  }
}
