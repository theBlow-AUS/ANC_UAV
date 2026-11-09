import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';
import { TRANSFER_MAX_CHARS, exportProfiles, parseTransfer, type ProfilesDoc, type TransferProfile } from './operating-profiles';

/** Writes a temporary JSON file and opens the system share sheet (Save to Files, AirDrop, Mail...). Local only; no network call. */
export async function shareProfileBackup(doc: ProfilesDoc): Promise<'shared' | 'dismissed'> {
  const text = exportProfiles(doc);
  if (!FileSystem.cacheDirectory) throw new Error('Device storage is not available for the backup file.');
  const uri = `${FileSystem.cacheDirectory}anc-uav-reoc-profiles-${new Date().toISOString().slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(uri, text);
  try {
    const result = await Share.share(Platform.OS === 'ios' ? { url: uri } : { message: text, title: 'ANC UAV ReOC profiles' });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}

/** Opens the system Files picker and validates the chosen file. Returns null if the user cancels. Nothing is saved here. */
export async function pickProfileBackup(): Promise<{ name: string; profiles: TransferProfile[] } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'public.json'], copyToCacheDirectory: true, multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  try {
    if (asset.size && asset.size > TRANSFER_MAX_CHARS) throw new Error('This file is larger than the supported profile size.');
    const raw = await FileSystem.readAsStringAsync(asset.uri);
    return { name: asset.name, profiles: parseTransfer(raw) };
  } finally {
    await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined);
  }
}
