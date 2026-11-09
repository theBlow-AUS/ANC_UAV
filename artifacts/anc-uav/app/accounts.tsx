import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';
import type { VaultProvider } from '../data/types';
import { PROVIDER_ACCESS } from '../data/provider-access';
import { useAppData } from '../context/AppDataContext';
import { deleteProviderCredential, isVaultAvailable, testProviderUnlock } from '../lib/secure-vault';

export default function AccountsScreen() {
  const colors = useColors();
  const { savedVaultProviders, setVaultProviderSaved } = useAppData();
  const [vaultAvailable, setVaultAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    isVaultAvailable().then(setVaultAvailable).catch(() => setVaultAvailable(false));
  }, []);

  async function unlock(provider: VaultProvider) {
    setBusy(true);
    try {
      await testProviderUnlock(provider);
      Alert.alert('Device authentication succeeded', 'The saved entry remains hidden. No provider connection or network request was made.');
    } catch (error) {
      Alert.alert('Could not unlock', error instanceof Error ? error.message : 'The saved entry could not be read.');
    } finally { setBusy(false); }
  }
  function remove(provider: VaultProvider) {
    Alert.alert('Delete saved credential?', 'This removes the protected entry from this device. There is no developer recovery copy.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void (async () => {
          setBusy(true);
          try {
            await deleteProviderCredential(provider);
            await setVaultProviderSaved(provider, false);
          } catch {
            Alert.alert('Delete failed', 'The secure-store entry could not be removed.');
          } finally { setBusy(false); }
        })();
      } },
    ]);
  }
  async function openProvider(url: string) {
    try { await Linking.openURL(url); } catch {
      Alert.alert('Provider site unavailable', 'Check your connection. Saved local snapshots remain available offline.');
    }
  }
  return (
    <Screen eyebrow="Device-only references" title="Provider Access" subtitle="Permission review comes before connection or credential capture." back>
      <Callout title="Direct downloads blocked — no approved agreements">
        Owning an account does not authorize automation, offline storage or agency redistribution. No supported authorization flow has been approved for this app. New credential capture is disabled, including CASA / myID. Existing vault entries can still be unlocked or deleted on the native device.
      </Callout>
      <SectionHeading title="Provider permission review" detail="Public terms checked 9 November 2026. This is not legal or operational approval." />
      {PROVIDER_ACCESS.map((provider) => (
        <Panel key={provider.id}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>{provider.label}</Text>
          <Badge tone="warning">DOWNLOAD BLOCKED — PERMISSION REQUIRED</Badge>
          <Text style={{ fontSize: 13, lineHeight: 20, color: colors.foreground }}>{provider.reason}</Text>
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>Required: {provider.required}</Text>
          <ActionButton label="Connect / download unavailable" icon="lock" onPress={() => undefined} disabled testID={`provider-download-${provider.id}`} />
          <ActionButton label="Open official site online" icon="external-link" secondary onPress={() => void openProvider(provider.url)} testID={`provider-site-${provider.id}`} />
          <ActionButton label="Local snapshots & updates" icon="folder" secondary onPress={() => router.push({ pathname: '/references', params: { provider: provider.id } })} testID={`provider-snapshots-${provider.id}`} />
          <Text style={{ fontSize: 11, lineHeight: 16, color: colors.mutedForeground }}>The official site opens outside this app and needs internet. Sign in only there. This app cannot read that session or download its content.</Text>
        </Panel>
      ))}
      <Callout title="CASA / myID not connected">
        No CASA or myID sign-in or credential capture is provided. AVCRM is not connected and remains a lowest-priority stretch goal.
      </Callout>
      <SectionHeading title="Existing device vault entries" detail="Provider labels only are held in app preferences. No credentials are sent to Replit or a provider." />
      {vaultAvailable === false ? (
        <Callout title="Native secure store unavailable" tone="danger">Open the native app on the device that saved the entry. Browser storage is not used as a credential fallback.</Callout>
      ) : null}
      {savedVaultProviders.length ? savedVaultProviders.map((provider) => (
        <Panel key={provider}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{provider === 'airservices' ? 'Airservices' : provider.toUpperCase()}</Text>
          <Badge>LOCAL ENTRY — NOT CONNECTED</Badge>
          <View style={{ gap: 8 }}>
            <ActionButton label="Test device unlock" icon="unlock" secondary onPress={() => void unlock(provider)} disabled={busy || vaultAvailable !== true} testID={`vault-unlock-${provider}`} />
            <ActionButton label="Delete saved entry" icon="trash-2" secondary onPress={() => remove(provider)} disabled={busy || vaultAvailable !== true} testID={`vault-delete-${provider}`} />
          </View>
        </Panel>
      )) : <Panel><Text style={{ fontSize: 13, color: colors.mutedForeground }}>No saved account entries. No account is required for local snapshots.</Text></Panel>}
    </Screen>
  );
}
