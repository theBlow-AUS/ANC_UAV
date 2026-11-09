import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { VaultProvider } from '../data/types';

const KEY_PREFIX = 'anc-uav.account.v1.';

function keyFor(provider: VaultProvider) {
  return `${KEY_PREFIX}${provider}`;
}

const options: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Unlock the ANC UAV device-only account vault',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveProviderCredential(
  provider: VaultProvider,
  accountName: string,
  secret: string,
) {
  // No supported, permission-reviewed authorization flow exists. Do not collect
  // speculative passwords, including via callers outside the Accounts screen.
  void provider;
  void accountName;
  void secret;
  throw new Error('Credential capture is disabled until a provider-supported authorization flow and operator rights are approved. Never enter CASA/myID credentials.');
}

export async function testProviderUnlock(provider: VaultProvider) {
  if (!(await isVaultAvailable())) throw new Error('Native device secure storage is unavailable.');
  const value = await SecureStore.getItemAsync(keyFor(provider), options);
  if (!value) throw new Error('No saved credential was found for this provider.');
  const parsed = JSON.parse(value) as { accountName?: string; secret?: string };
  if (!parsed.accountName || !parsed.secret) {
    throw new Error('The saved entry is incomplete. Remove it and save it again.');
  }
  return true;
}

export async function deleteProviderCredential(provider: VaultProvider) {
  if (!(await isVaultAvailable())) throw new Error('Native device secure storage is unavailable.');
  await SecureStore.deleteItemAsync(keyFor(provider), options);
}

export async function isVaultAvailable() {
  return Platform.OS !== 'web' && SecureStore.isAvailableAsync();
}
