import { Platform, Share } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import type { OpenAipDisk } from './openaip-store';

const POINTER_PREFIX = 'anc-uav.openaip.files.v1.';
const KEY_NAME = 'anc-uav.openaip.personal-key.v1';
const KEY_FLAG = 'anc-uav.openaip.key-present.v1';
export class OpenAipKeyError extends Error {}
const keyOptions: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Unlock your OpenAIP key for this request',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const canDownloadOpenAip = Platform.OS !== 'web';
export async function shareOpenAipSnapshot(name: string) {
  if (Platform.OS !== 'ios' || !name.startsWith('snapshot-')) throw new Error('File sharing is available on iOS only.');
  await Share.share({ url: fileUri(name), message: 'OpenAIP contributors · CC BY-NC 4.0 and published app-use conditions: https://www.openaip.net/legal' });
}
function directory() {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) throw new Error('OpenAIP downloads require the native app.');
  return `${FileSystem.documentDirectory}anc-openaip-v1/`;
}
function fileUri(name: string) {
  if (!/^(snapshot|details)-[a-z0-9-]+\.json$/.test(name)) throw new Error('Invalid local OpenAIP filename.');
  return `${directory()}${name}`;
}
export const openAipDisk: OpenAipDisk = {
  getPointer: namespace => AsyncStorage.getItem(`${POINTER_PREFIX}${namespace}`),
  setPointer: (namespace, value) => value === null
    ? AsyncStorage.removeItem(`${POINTER_PREFIX}${namespace}`)
    : AsyncStorage.setItem(`${POINTER_PREFIX}${namespace}`, value),
  async read(name) {
    const uri = fileUri(name), info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    if (info.isDirectory || info.size > 32 * 1024 * 1024) throw new Error('Stored OpenAIP file exceeds its size limit.');
    return FileSystem.readAsStringAsync(uri);
  },
  async write(name, value) {
    await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
    await FileSystem.writeAsStringAsync(fileUri(name), value);
  },
  async remove(name) { await FileSystem.deleteAsync(fileUri(name), { idempotent: true }); },
  async list() {
    const d = directory(), info = await FileSystem.getInfoAsync(d);
    return info.exists ? FileSystem.readDirectoryAsync(d) : [];
  },
};
export async function openAipKeyAvailable() {
  // Expo Go cannot honour this app's Face ID configuration. Never weaken protection.
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  try { return await SecureStore.isAvailableAsync() && SecureStore.canUseBiometricAuthentication(); }
  catch { return false; }
}
export function validateOpenAipKey(value: string) {
  const key = value.trim();
  if (!/^[A-Za-z0-9._-]{16,512}$/.test(key)) throw new OpenAipKeyError('Enter a valid OpenAIP client key without spaces or line breaks.');
  return key;
}
export async function openAipKeyStatus(): Promise<'saved' | 'none' | 'unavailable' | 'unknown'> {
  if (!(await openAipKeyAvailable())) return 'unavailable';
  try { return await AsyncStorage.getItem(KEY_FLAG) === 'yes' ? 'saved' : 'none'; }
  catch { return 'unknown'; }
}
export async function saveOpenAipKey(value: string) {
  const key = validateOpenAipKey(value);
  if (!(await openAipKeyAvailable())) throw new OpenAipKeyError('Protected OpenAIP key storage needs a native build with enrolled device authentication.');
  try { await SecureStore.setItemAsync(KEY_NAME, key, keyOptions); }
  catch { throw new OpenAipKeyError('The OpenAIP key was not saved. Device authentication or protected storage was unavailable.'); }
  // This flag is not a credential; it avoids decrypting anything on launch.
  try { await AsyncStorage.setItem(KEY_FLAG, 'yes'); }
  catch { throw new OpenAipKeyError('Protected key may be saved, but its status could not be recorded. Replace or remove it explicitly.'); }
}
export async function readOpenAipKey() {
  if (!(await openAipKeyAvailable())) throw new OpenAipKeyError('Protected OpenAIP key storage is unavailable.');
  try {
    const value = await SecureStore.getItemAsync(KEY_NAME, keyOptions);
    if (!value) throw new Error('Missing');
    return validateOpenAipKey(value);
  } catch { throw new OpenAipKeyError('The OpenAIP key could not be unlocked. Authenticate again, or replace/remove the key.'); }
}
export async function removeOpenAipKey() {
  // Deletion must still work if biometrics were removed/changed after saving.
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) throw new OpenAipKeyError('Native protected storage is unavailable.');
  try { await SecureStore.deleteItemAsync(KEY_NAME, keyOptions); }
  catch { throw new OpenAipKeyError('The OpenAIP key could not be removed. Try again on the native device.'); }
  try { await AsyncStorage.removeItem(KEY_FLAG); }
  catch { throw new OpenAipKeyError('Protected key was removed, but its status marker could not be cleared. No new requests will use that removed key.'); }
}
