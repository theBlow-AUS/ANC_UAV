import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { AgencyContentPack, LocalDocument } from '../data/types';
import { parseAgencyPack } from '../data/pack-validator';

export type ImportResult =
  | { kind: 'pack'; pack: AgencyContentPack }
  | { kind: 'document'; document: LocalDocument };

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 180_000;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'imported-file';
}

export async function pickAndImportContent(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'text/markdown', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_FILE_BYTES) {
    throw new Error('This file is larger than the 30 MB local import limit.');
  }
  if (!FileSystem.documentDirectory) {
    throw new Error('Device document storage is not available.');
  }

  const directory = `${FileSystem.documentDirectory}anc-uav/imports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const localUri = `${directory}${Date.now()}-${safeFileName(asset.name)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: localUri });

  const lowerName = asset.name.toLowerCase();
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  if (lowerName.endsWith('.json') || mimeType === 'application/json') {
    const raw = await FileSystem.readAsStringAsync(localUri);
    if (raw.length > 2_000_000) throw new Error('Content-pack JSON exceeds the 2 MB limit.');
    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      throw new Error('The selected JSON file could not be parsed.');
    }
    const pack = parseAgencyPack(json, localUri);
    return { kind: 'pack', pack };
  }

  const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';
  const isText =
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown';
  if (!isPdf && !isText) {
    throw new Error('Choose a JSON content pack, PDF, Markdown, or plain-text file.');
  }

  const textContent = isText ? await FileSystem.readAsStringAsync(localUri) : undefined;
  if (textContent && textContent.length > MAX_TEXT_CHARACTERS) {
    throw new Error('This text document is too large for the first iteration.');
  }

  const document: LocalDocument = {
    id: `local-${Date.now().toString(36)}`,
    title: asset.name.replace(/\.[^.]+$/, ''),
    fileName: asset.name,
    mimeType: isPdf ? 'application/pdf' : 'text/plain',
    issuer: 'User supplied — not verified',
    jurisdiction: 'Unspecified',
    localUri,
    importedAt: new Date().toISOString(),
    contentState: 'user-imported-unverified',
    ...(textContent ? { textContent } : {}),
  };
  return { kind: 'document', document };
}

export async function deleteImportedFile(localUri: string) {
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) await FileSystem.deleteAsync(localUri, { idempotent: true });
}
