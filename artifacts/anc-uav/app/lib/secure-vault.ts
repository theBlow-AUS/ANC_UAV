import * as SecureStore from 'expo-secure-store';
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
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error('Secure device storage is unavailable on this device.');
  }
  await SecureStore.setItemAsync(
    keyFor(provider),
    JSON.stringify({ accountName, secret, savedAt: new Date().toISOString() }),
    options,
  );
}

export async function testProviderUnlock(provider: VaultProvider) {
  const value = await SecureStore.getItemAsync(keyFor(provider), options);
  if (!value) throw new Error('No saved credential was found for this provider.');
  const parsed = JSON.parse(value) as { accountName?: string; secret?: string };
  if (!parsed.accountName || !parsed.secret) {
    throw new Error('The saved entry is incomplete. Remove it and save it again.');
  }
  return true;
}

export async function deleteProviderCredential(provider: VaultProvider) {
  await SecureStore.deleteItemAsync(keyFor(provider), options);
}

export async function isVaultAvailable() {
  return SecureStore.isAvailableAsync();
}
