import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading, TextField } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';
import type { VaultProvider } from './data/types';
import { useAppData } from './context/AppDataContext';
import { deleteProviderCredential, isVaultAvailable, saveProviderCredential, testProviderUnlock } from './lib/secure-vault';

const PROVIDERS: Array<{ id: VaultProvider; label: string }> = [
  { id: 'naips', label: 'NAIPS' },
  { id: 'airservices', label: 'Airservices data' },
  { id: 'casa', label: 'CASA account' },
];

export default function AccountsScreen() {
  const colors = useColors();
  const { savedVaultProviders, setVaultProviderSaved } = useAppData();
  const [provider, setProvider] = useState<VaultProvider>('naips');
  const [accountName, setAccountName] = useState('');
  const [secret, setSecret] = useState('');
  const [vaultAvailable, setVaultAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isVaultAvailable().then(setVaultAvailable).catch(() => setVaultAvailable(false));
  }, []);

  async function save() {
    if (!accountName.trim() || !secret) {
      Alert.alert('Details required', 'Enter an account label and credential to save a local entry.');
      return;
    }
    setBusy(true);
    try {
      await saveProviderCredential(provider, accountName.trim(), secret);
      await setVaultProviderSaved(provider, true);
      setAccountName('');
      setSecret('');
      Alert.alert('Saved on this device', 'The account entry is protected by the device secure store. No network request was made.');
    } catch (error) {
      Alert.alert(
        'Secure save failed',
        error instanceof Error
          ? `${error.message} Do not enter a live credential until the native secure-store flow has been tested on the target device.`
          : 'The device secure store could not save this entry.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function unlock(providerId: VaultProvider) {
    setBusy(true);
    try {
      await testProviderUnlock(providerId);
      Alert.alert('Device authentication succeeded', 'The saved credential remains hidden and was not sent anywhere.');
    } catch (error) {
      Alert.alert('Could not unlock', error instanceof Error ? error.message : 'The saved entry could not be read.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(providerId: VaultProvider) {
    Alert.alert('Delete saved credential?', 'This removes the local secure-store entry from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deleteProviderCredential(providerId);
              await setVaultProviderSaved(providerId, false);
            } catch {
              Alert.alert('Delete failed', 'The secure-store entry could not be removed.');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  const activeProviderLabel = PROVIDERS.find((item) => item.id === provider)?.label ?? provider;

  return (
    <Screen
      eyebrow="Device-only vault"
      title="Secure Accounts"
      subtitle="Credentials are protected by the device, not stored in app preferences."
      back
    >
      <Callout title="Local vault only — no provider connections">
        Entries are protected using iOS Keychain / Android Keystore with device authentication. This app has no credential server, developer recovery route, or provider download adapter. Saving a credential does not grant permission to automate access.
      </Callout>
      {vaultAvailable === false ? (
        <Callout title="Secure storage unavailable" tone="danger">
          This runtime cannot use the device secure store. Do not enter any live account details here.
        </Callout>
      ) : null}
      {vaultAvailable === true ? (
        <Panel>
          <Badge tone="good">DEVICE SECURE STORE AVAILABLE</Badge>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            On iOS, entries use the current device’s Keychain and do not migrate to a restored device. The app itself does not have a server-side copy.
          </Text>
        </Panel>
      ) : null}

      <SectionHeading title="Provider access status" />
      <Panel>
        {PROVIDERS.map((item, index) => (
          <View key={item.id} style={{ borderTopWidth: index ? 1 : 0, borderTopColor: colors.border, paddingTop: index ? 11 : 0, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.label}</Text>
              <Badge tone="warning">CONNECTION OFF</Badge>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
              {item.id === 'casa'
                ? 'No CASA or myID sign-in is implemented. Never enter a myID password in this app.'
                : 'Credentials can be held locally, but NAIPS / Airservices download use is not enabled pending provider terms and agency approval.'}
            </Text>
          </View>
        ))}
      </Panel>

      <SectionHeading title="Save an account entry" detail="Use only if you want it stored locally for future authorized use." />
      <Panel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PROVIDERS.map((item) => (
            <ActionButton
              key={item.id}
              label={item.label}
              secondary={provider !== item.id}
              onPress={() => setProvider(item.id)}
              disabled={item.id === 'casa' || vaultAvailable === false}
              testID={`vault-provider-${item.id}`}
            />
          ))}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>
          CASA / myID credential capture is disabled. Selected provider: {activeProviderLabel}.
        </Text>
        <TextField label="Account name or user ID" value={accountName} onChangeText={setAccountName} autoCapitalize="none" autoCorrect={false} placeholder="Account name" testID="vault-account-name" />
        <TextField label="Password or credential" value={secret} onChangeText={setSecret} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" placeholder="Stored in the device secure store" testID="vault-secret" />
        <ActionButton
          label={busy ? 'Working…' : 'Save on this device'}
          icon="lock"
          onPress={save}
          disabled={busy || vaultAvailable !== true || provider === 'casa'}
          testID="save-secure-credential"
        />
        <Text style={{ fontSize: 11, lineHeight: 16, color: colors.mutedForeground }}>
          Do not put credentials in notes, documents, or imported packs. This form keeps the password out of AsyncStorage.
        </Text>
      </Panel>

      <SectionHeading title="Saved entries" detail="Provider names only are listed in ordinary app storage." />
      {savedVaultProviders.length ? (
        savedVaultProviders.map((providerId) => (
          <Panel key={providerId}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                {PROVIDERS.find((item) => item.id === providerId)?.label ?? providerId}
              </Text>
              <Badge tone="good">DEVICE ONLY</Badge>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <ActionButton label="Test device unlock" icon="unlock" secondary onPress={() => void unlock(providerId)} disabled={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton label="Delete" icon="trash-2" secondary onPress={() => remove(providerId)} disabled={busy} />
              </View>
            </View>
          </Panel>
        ))
      ) : (
        <Panel>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            No saved account entries.
          </Text>
        </Panel>
      )}
    </Screen>
  );
}
