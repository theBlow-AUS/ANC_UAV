import { File } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Image, Platform, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';
import { PROVIDER_ACCESS, type ReferenceProvider } from '../data/provider-access';
import { snapshotStatus, type ReferenceSnapshot } from '../data/reference-snapshot';
import { deleteReferenceSnapshot, importReferenceSnapshot, listReferenceSnapshots, readReferenceText, snapshotFileUri } from '../lib/reference-storage';

export default function ReferencesScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ provider?: string }>();
  const [provider, setProvider] = useState<ReferenceProvider>(
    PROVIDER_ACCESS.find((p) => p.id === params.provider)?.id ?? 'airservices',
  );
  const [snapshots, setSnapshots] = useState<ReferenceSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ id: string; text?: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const native = Platform.OS !== 'web';
  const reload = useCallback(async () => {
    if (!native) { setLoaded(true); return; }
    try {
      const result = await listReferenceSnapshots();
      setSnapshots(result.snapshots);
      setError(result.errors.length ? result.errors.join('\n') : null);
      setLoaded(true);
    } catch {
      setError('Device snapshots could not be loaded. Retry before importing or removing anything.');
      setLoaded(false);
    }
  }, [native]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') { setNow(Date.now()); void reload(); }
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [reload]);

  async function acquire(replacing?: ReferenceSnapshot) {
    if (busy || !loaded) return;
    setBusy(true);
    setNotice(null);
    try {
      const snapshot = await importReferenceSnapshot(provider, replacing);
      if (!snapshot) { setNotice('Import cancelled. Existing snapshots were not changed.'); return; }
      await reload();
      setNotice(replacing ? 'Replacement saved. The previous snapshot is retained until you explicitly remove it.' : 'Snapshot saved locally. Source, rights and currency remain unverified.');
    } catch (e) {
      setNotice(`Import/update failed. Existing snapshots were not changed. ${e instanceof Error ? e.message : 'Could not read the selected files.'}`);
    } finally { setBusy(false); }
  }
  function confirmImport(replacing?: ReferenceSnapshot) {
    Alert.alert(replacing ? 'Import a replacement?' : 'Import an authorized local copy?', 'Confirm you have permission to store this material for the operator/agency and use stated in the manifest. This assertion does not approve a provider connection or redistribution. First choose its manifest JSON, then the matching reference file. No website download is performed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'I have storage rights', onPress: () => void acquire(replacing) },
    ]);
  }
  async function view(snapshot: ReferenceSnapshot) {
    setBusy(true);
    try {
      if (snapshot.format === 'pdf') await new File(snapshotFileUri(snapshot)).preview();
      else if (snapshot.format === 'text') setOpened({ id: snapshot.id, text: await readReferenceText(snapshot) });
      else setOpened({ id: snapshot.id });
    } catch {
      setNotice('The local reference could not be opened. It may be missing, corrupt or unsupported by this device. Other snapshots were not changed.');
    } finally { setBusy(false); }
  }
  function remove(snapshot: ReferenceSnapshot) {
    Alert.alert('Remove this local snapshot?', 'This deletes only this version from this device. Other saved versions and vault entries are unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        void (async () => {
          setBusy(true);
          try {
            await deleteReferenceSnapshot(snapshot);
            if (opened?.id === snapshot.id) setOpened(null);
            await reload();
          } catch { setNotice('Removal failed. Reload the list to check device storage.'); }
          finally { setBusy(false); }
        })();
      } },
    ]);
  }
  return (
    <Screen eyebrow="Offline local copies" title="Reference Snapshots" subtitle="Import and replace authorized files on this device. No automated provider access." back>
      <Callout title="Offline snapshots — not live provider data">
        Offline viewing is supported; online currentness checks and direct downloads are blocked. A successful import does not verify source authenticity, aviation content or rights. Camera snapshots are historical, never current weather. Use current authorized operational sources before flight.
      </Callout>
      {!native ? <Callout title="Native device required">The browser preview cannot acquire, store or view protected device references. Use the native app. Provider permissions and manifest instructions are shown here for reference.</Callout> : null}
      <View style={{ gap: 8, marginBottom: 16 }}>
        {PROVIDER_ACCESS.map((p) => (
          <ActionButton key={p.id} label={p.label} secondary={provider !== p.id} onPress={() => { setProvider(p.id); setOpened(null); setNotice(null); }} disabled={busy} testID={`snapshot-provider-${p.id}`} />
        ))}
      </View>
      <SectionHeading title="Acquire / update a local reference" />
      <Panel>
        <Badge tone="warning">DIRECT DOWNLOAD BLOCKED</Badge>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.foreground }}>
          Choose a prepared manifest JSON, then its matching file. AIP: PDF. NAIPS: PDF or plain-text briefing. Weather cameras: PNG or JPEG. Maximum 10 MB per file. Do not include passwords, account identifiers or private briefing details in source URLs.
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>
          The manifest records title, stable reference ID, official source URL, source issue/capture time, effective from/to, licence reference, and operator/agency use scope. Dates may be null if unknown; unknown validity is never current. Structural validation does not verify publication content.
        </Text>
        <ActionButton label={busy ? 'Working…' : 'Import authorized local snapshot'} icon="folder-plus" onPress={() => confirmImport()} disabled={busy || !native || !loaded} testID="snapshot-import" />
        <ActionButton label="Show manifest example" icon="file-text" secondary onPress={() => setOpened(opened?.id === 'example' ? null : { id: 'example' })} testID="snapshot-manifest-example" />
        {opened?.id === 'example' ? (
          <Text selectable style={{ fontSize: 12, lineHeight: 19, color: colors.foreground }}>
            {JSON.stringify({
              schemaVersion: 1, provider, referenceId: 'replace-with-stable-reference-id',
              title: 'Replace with publication or camera title',
              sourceUrl: PROVIDER_ACCESS.find((p) => p.id === provider)!.url,
              sourceIssuedAt: null, effectiveFrom: null, effectiveTo: null,
              rightsReference: 'Replace with your actual permission / licence reference',
              authorizedUseScope: 'Replace with covered operator / agency and permitted use',
              format: provider === 'weathercams' ? 'jpeg' : provider === 'naips' ? 'text' : 'pdf',
            }, null, 2)}
          </Text>
        ) : null}
      </Panel>
      {notice ? <Callout title="Last action">{notice}</Callout> : null}
      {error ? <Callout title="Local storage error" tone="danger">{error}</Callout> : null}
      <ActionButton label="Reload local list" icon="refresh-cw" secondary onPress={() => void reload()} disabled={!native || busy} testID="snapshot-reload" />
      <SectionHeading title="Saved snapshots" detail="Local copies only. Replacement retains earlier versions; remove those explicitly." />
      {!loaded ? <Panel><Text style={{ color: colors.mutedForeground }}>Local list not loaded.</Text></Panel> : null}
      {snapshots.filter((s) => s.provider === provider).map((snapshot) => (
        <Panel key={snapshot.id}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{snapshot.title}</Text>
          <Badge tone="warning">UNVERIFIED LOCAL COPY</Badge>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>{snapshotStatus(snapshot, now)}</Text>
          <Text selectable style={{ fontSize: 12, lineHeight: 19, color: colors.mutedForeground }}>
            {`Reference: ${snapshot.referenceId}\nSource: ${snapshot.sourceUrl}\nIssued / captured (declared): ${snapshot.sourceIssuedAt ?? 'Unknown'}\nEffective from: ${snapshot.effectiveFrom ?? 'Unknown'}\nEffective to: ${snapshot.effectiveTo ?? 'Unknown'}\nStored: ${snapshot.importedAt}\nRights (unverified): ${snapshot.rightsReference}\nOperator / use (unverified): ${snapshot.authorizedUseScope}`}
          </Text>
          <ActionButton label="Open local copy" icon="file" secondary onPress={() => void view(snapshot)} disabled={busy} testID={`snapshot-open-${snapshot.id}`} />
          {opened?.id === snapshot.id ? (
            snapshot.format === 'text' ? <Text selectable style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>{opened.text}</Text> : (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.destructive, fontWeight: '700' }}>HISTORICAL IMAGE — NOT CURRENT WEATHER</Text>
                <Image source={{ uri: snapshotFileUri(snapshot) }} style={{ width: '100%', height: 240 }} resizeMode="contain"
                  accessibilityLabel={`Historical camera image. Capture time ${snapshot.sourceIssuedAt ?? 'unknown'}. Not current weather.`}
                  onError={() => { setOpened(null); setNotice('This image could not be decoded. It is not a usable weather observation.'); }} />
              </View>
            )
          ) : null}
          <ActionButton label="Import replacement locally" icon="refresh-cw" secondary onPress={() => confirmImport(snapshot)} disabled={busy || !loaded} testID={`snapshot-update-${snapshot.id}`} />
          <ActionButton label="Remove this version" icon="trash-2" secondary onPress={() => remove(snapshot)} disabled={busy} testID={`snapshot-delete-${snapshot.id}`} />
        </Panel>
      ))}
      {loaded && !snapshots.some((s) => s.provider === provider) ? <Panel><Text style={{ color: colors.mutedForeground }}>No local snapshots for this provider. Offline coverage is missing, not clear or safe.</Text></Panel> : null}
    </Screen>
  );
}
