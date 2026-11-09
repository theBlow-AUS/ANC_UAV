import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import type { NavigationPack, Provenance } from '../data/navigation-pack';
import { useColors } from '../hooks/useColors';
import { pickNavigationPack } from '../lib/navigation-storage';
import { sourceStatus } from '../lib/navigation';
import { ActionButton, Badge, Callout, Panel, SectionHeading } from './FieldKit';

export function SourceDetails({ source, utc }: { source: Provenance; utc: string }) {
  const colors = useColors();
  return <Text selectable style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
    {source.publisher} · {source.edition}{'\n'}
    {sourceStatus(source, utc)} · {source.effectiveFrom ?? 'unknown start'} → {source.effectiveTo ?? 'unknown end'}{'\n'}
    Retrieved: {source.retrievedAt}{'\n'}
    Source: {source.source}{'\n'}
    {source.licence} · Rights: {source.rightsReference}{'\n'}{source.attribution}
  </Text>;
}

export function NavigationPacks() {
  const { packs, active, ready, busy, error, query, install, select, remove, canReset, resetUnreadable } = useNavigation();
  const colors = useColors();
  const [pending, setPending] = useState<NavigationPack | null>(null);
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState('');
  async function perform(action: () => Promise<void>) {
    setMessage('');
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Device storage operation failed.'); }
  }
  return <>
    <SectionHeading title="On-device navigation packs" detail="JSON imports only. No map server, subscription, or automatic provider download." />
    {error || message ? <Callout title="Navigation storage notice">{message || error}</Callout> : null}
    {canReset ? <Panel>
      <Text style={{ color: colors.destructive, fontSize: 13 }}>
        Recovery requires deleting the unreadable navigation store, then importing your original pack files again. Agency content, documents and incident assignments are not affected.
      </Text>
      <ActionButton label="Reset unreadable navigation storage" secondary disabled={busy} onPress={() => Alert.alert(
        'Delete unreadable navigation data?',
        'This permanently deletes all imported navigation packs on this device. You must have your original files to restore them. It does not delete agency packs, documents, incident assignments or original files.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete navigation data', style: 'destructive', onPress: () => void perform(resetUnreadable) }],
      )} />
    </Panel> : null}
    {!ready ? <Callout title="Loading local packs">Aviation lookup is unavailable until device storage has been read.</Callout> : null}
    <Panel>
      <Badge tone="warning">REFERENCE / IMPORTED DATA — NOT APPROVED</Badge>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
        {active.name} is the displayed map. Nearby places and frequency lookup search every installed pack, not only this map. Imported claims of completeness or approval are not independently verified.
      </Text>
      {packs.filter(pack => pack.land.length > 0 || pack.places.length > 0).map(pack => <ActionButton key={pack.id} label={`${active.id === pack.id ? 'Selected: ' : 'Show: '}${pack.name}`}
        secondary={active.id !== pack.id} disabled={!ready || busy || !!pending}
        onPress={() => void perform(() => select(pack.id))} testID={`select-nav-${pack.id}`} />)}
      {packs.filter(pack => pack.land.length === 0 && pack.places.length === 0).map(pack => <Text key={pack.id} style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
        {pack.name} · {pack.coverage.frequencies.toUpperCase()} frequencies · reference only{'\n'}{pack.coverage.notes}
      </Text>)}
      <SourceDetails source={active.provenance} utc={query.utc} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{active.coverage.notes}</Text>
      <ActionButton label="Import navigation pack" icon="download" disabled={!ready || busy || picking || !!pending}
        testID="import-navigation-pack" onPress={() => {
          setPicking(true);
          void perform(async () => setPending(await pickNavigationPack())).finally(() => setPicking(false));
        }} />
      {active.id !== 'natural-earth-au' && active.id !== 'openaip-au-area-frequency' ? <ActionButton label="Remove selected pack" icon="trash-2" secondary disabled={busy || !!pending}
        onPress={() => Alert.alert('Remove navigation pack?', 'Only this device’s copy is removed. Keep your original pack file if you need to reinstall it.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => void perform(() => remove(active.id)) },
        ])} /> : null}
    </Panel>
    {pending ? <Panel>
      <Badge tone="warning">REVIEW BEFORE SAVING</Badge>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{pending.name} · {pending.places.length} places · {pending.frequencies.length} frequencies</Text>
      <SourceDetails source={pending.provenance} utc={query.utc} />
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
        Confirm you hold rights for offline storage and this intended use. A filename or provider account is not permission. This assertion does not verify the licence or approve the data.
        {packs.some(p => p.id === pending.id) ? ' Saving will replace the installed pack with this same identifier.' : ''}
      </Text>
      <ActionButton label="I have rights — save locally" testID="confirm-navigation-import" disabled={busy}
        onPress={() => void perform(async () => { await install(pending); setPending(null); setMessage('Pack saved on this device. It remains unverified.'); })} />
      <ActionButton label="Cancel import" secondary disabled={busy} onPress={() => setPending(null)} />
    </Panel> : null}
  </>;
}
