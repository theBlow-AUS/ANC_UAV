import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  MAX_SNAPSHOT_BYTES, parseSnapshotManifest, snapshotUtc, validateSnapshotBytes,
  type ReferenceSnapshot, type SnapshotFormat,
} from '../data/reference-snapshot';
import type { ReferenceProvider } from '../data/provider-access';

function root() {
  // Never use browser storage / its SecureStore polyfill for provider material.
  if (Platform.OS === 'web' || !FileSystem.documentDirectory)
    throw new Error('Reference snapshots require the native app and device-local storage.');
  return `${FileSystem.documentDirectory}anc-uav/references/`;
}
function directory(id: string) {
  if (!/^snapshot-[a-z0-9-]+$/.test(id)) throw new Error('Invalid snapshot identifier.');
  return `${root()}${id}/`;
}
export function snapshotFileUri(snapshot: ReferenceSnapshot) {
  return `${directory(snapshot.id)}reference.${snapshot.format === 'text' ? 'txt' : snapshot.format}`;
}
function base64Bytes(input: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits = 0, count = 0;
  const out: number[] = [];
  for (const c of input.replace(/=+$/, '')) {
    const digit = alphabet.indexOf(c);
    if (digit < 0) throw new Error('Could not read file bytes.');
    bits = (bits << 6) | digit;
    count += 6;
    if (count >= 8) { count -= 8; out.push((bits >> count) & 255); }
  }
  return out;
}
async function validateFile(uri: string, format: SnapshotFormat) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory || info.size <= 0 || info.size > MAX_SNAPSHOT_BYTES)
    throw new Error('Choose a non-empty reference file up to 10 MB.');
  if (format === 'text' && info.size > 720_000) throw new Error('Text briefing exceeds the local text limit.');
  const length = Math.min(info.size, 1024);
  const head = base64Bytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: 0, length }));
  const tail = base64Bytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: info.size - length, length }));
  const text = format === 'text' ? await FileSystem.readAsStringAsync(uri) : undefined;
  validateSnapshotBytes(format, head, tail, text);
  return text;
}
async function cleanup(uri?: string) {
  if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
}

/** Two local picks. No URL from a manifest is ever fetched. Commit is a directory rename. */
export async function importReferenceSnapshot(provider: ReferenceProvider, replacing?: ReferenceSnapshot): Promise<ReferenceSnapshot | null> {
  const base = root();
  let manifestUri: string | undefined;
  let payloadUri: string | undefined;
  let staging: string | undefined;
  try {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
    if (picked.canceled || !picked.assets[0]) return null;
    manifestUri = picked.assets[0].uri;
    const manifestInfo = await FileSystem.getInfoAsync(manifestUri);
    if (!manifestInfo.exists || manifestInfo.isDirectory || manifestInfo.size > 16_000)
      throw new Error('Choose a snapshot manifest JSON up to 16 KB.');
    const manifest = parseSnapshotManifest(JSON.parse(await FileSystem.readAsStringAsync(manifestUri)), provider);
    if (replacing && (manifest.referenceId !== replacing.referenceId || manifest.provider !== replacing.provider))
      throw new Error('An update must use the same provider and reference ID as the saved snapshot.');
    if (replacing?.sourceIssuedAt && (!manifest.sourceIssuedAt || Date.parse(manifest.sourceIssuedAt) < Date.parse(replacing.sourceIssuedAt)))
      throw new Error('The update has a missing or older source timestamp. The saved snapshot was not changed.');
    const mime = { pdf: 'application/pdf', text: 'text/plain', png: 'image/png', jpeg: 'image/jpeg' }[manifest.format];
    const payload = await DocumentPicker.getDocumentAsync({ type: mime, copyToCacheDirectory: true, multiple: false });
    if (payload.canceled || !payload.assets[0]) return null;
    payloadUri = payload.assets[0].uri;
    const id = `snapshot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await FileSystem.makeDirectoryAsync(base, { intermediates: true });
    staging = `${base}.pending-${id}/`;
    await FileSystem.makeDirectoryAsync(staging, { intermediates: true });
    const fileName = `reference.${manifest.format === 'text' ? 'txt' : manifest.format}`;
    await FileSystem.copyAsync({ from: payloadUri, to: `${staging}${fileName}` });
    await validateFile(`${staging}${fileName}`, manifest.format);
    const snapshot: ReferenceSnapshot = { ...manifest, id, importedAt: new Date().toISOString(), contentState: 'user-imported-unverified' };
    await FileSystem.writeAsStringAsync(`${staging}manifest.json`, JSON.stringify(snapshot));
    await FileSystem.moveAsync({ from: staging, to: directory(id) });
    staging = undefined;
    // The prior copy is intentionally retained. A failed update cannot destroy it.
    return snapshot;
  } finally {
    await Promise.all([cleanup(staging), cleanup(manifestUri), cleanup(payloadUri)].map((p) => p.catch(() => undefined)));
  }
}

export async function listReferenceSnapshots(): Promise<{ snapshots: ReferenceSnapshot[]; errors: string[] }> {
  const base = root();
  await FileSystem.makeDirectoryAsync(base, { intermediates: true });
  const snapshots: ReferenceSnapshot[] = [];
  const errors: string[] = [];
  for (const id of await FileSystem.readDirectoryAsync(base)) {
    if (id.startsWith('.pending-')) continue; // Interrupted import is never published.
    try {
      const uri = directory(id);
      const info = await FileSystem.getInfoAsync(`${uri}manifest.json`);
      if (!info.exists || info.isDirectory || info.size > 20_000) throw new Error('Invalid local manifest.');
      const raw = JSON.parse(await FileSystem.readAsStringAsync(`${uri}manifest.json`));
      const { id: storedId, importedAt, contentState, ...manifest } = raw;
      if (storedId !== id || contentState !== 'user-imported-unverified') throw new Error('Invalid local snapshot.');
      const parsed = parseSnapshotManifest(manifest);
      const date = snapshotUtc(importedAt, 'Stored at');
      if (!date) throw new Error('Missing storage timestamp.');
      const snapshot: ReferenceSnapshot = { ...parsed, id, importedAt: date, contentState: 'user-imported-unverified' };
      await validateFile(snapshotFileUri(snapshot), snapshot.format);
      snapshots.push(snapshot);
    } catch {
      errors.push(`A saved reference (${id}) is missing or invalid. It was not loaded; no other copy was changed.`);
    }
  }
  return { snapshots: snapshots.sort((a, b) => b.importedAt.localeCompare(a.importedAt)), errors };
}
export async function readReferenceText(snapshot: ReferenceSnapshot) {
  if (snapshot.format !== 'text') throw new Error('Not a text reference.');
  return (await validateFile(snapshotFileUri(snapshot), snapshot.format))!;
}
export async function deleteReferenceSnapshot(snapshot: ReferenceSnapshot) {
  await FileSystem.deleteAsync(directory(snapshot.id), { idempotent: true });
}
