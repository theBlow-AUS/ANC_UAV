import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ActionButton, Badge, Callout, DISPLAY, Grid, Panel, Tile } from '@/components/FieldKit';
import { AircraftTiles } from '@/components/AircraftKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { formatMetres } from '@/lib/aircraft';
import { findVersion, type ProfileVersion } from '@/lib/operating-profiles';
import { useProfiles } from '@/lib/profile-store';

export function operationText(v: Pick<ProfileVersion, 'operationType' | 'customOperation'>) {
  return v.operationType === 'CUSTOM' ? `Custom: ${v.customOperation}` : v.operationType;
}

const openSettings = () => router.navigate('/settings');

/** Aviate: identity, four limits and aircraft tiles, all from the same saved active version. */
export function ActiveProfile() {
  const c = useColors();
  const ui = useUi();
  const { doc, hydrated, readBlocked, error } = useProfiles();
  const cols = ui.wide ? 4 : 2;

  if (!hydrated) {
    return (
      <View testID="profile-loading" accessibilityLabel="Loading saved operating profile" style={{ marginBottom: 12, gap: 8 }}>
        <View style={{ height: ui.fs(80), backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: c.border, opacity: 0.6 }} />
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(15), fontWeight: '700' }}>Loading saved operating profile. No limits are shown until it loads.</Text>
      </View>
    );
  }
  const match = findVersion(doc, doc?.activeVersionId ?? null);
  if (readBlocked || !match) {
    return (
      <View testID="profile-none" style={{ marginBottom: 12 }}>
        <Panel>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(28), textTransform: 'uppercase' }}>
            {readBlocked ? 'Profiles could not load' : 'No profile in use'}
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: ui.fs(15), fontWeight: '700' }}>
            {readBlocked ? (error ?? 'Saved profiles could not be read. Nothing has been overwritten.') : 'No operating limits are shown. Choose a saved profile version with Use version in Settings.'}
          </Text>
          <ActionButton icon="settings" label={readBlocked ? 'Open Settings to reload' : 'Choose in Settings'} onPress={openSettings} testID="profile-open-settings" />
        </Panel>
      </View>
    );
  }
  const { profile, version } = match;
  const L = version.limits;
  return (
    <View testID="active-profile">
      <View accessible accessibilityLabel={`In use: ${profile.reoc}, ${profile.name}, ${operationText(version)}, version ${version.label}`}
        style={{ backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: c.signal, padding: 12, marginBottom: 10, gap: 4 }}>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '800' }}>{profile.reoc}</Text>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(30), lineHeight: ui.fs(32), textTransform: 'uppercase' }}>{profile.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge>{operationText(version)}</Badge>
          <Badge>{`Version ${version.label}`}</Badge>
        </View>
        <Text style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '700' }}>
          {version.manual ? `Manual: ${version.manual}` : 'No manual reference entered.'}
          {version.effectiveNote ? `\nEffective: ${version.effectiveNote}` : ''}
        </Text>
      </View>
      <Badge tone="warning">OPERATOR-CONFIGURED · UNVERIFIED</Badge>
      <View style={{ height: 8 }} />
      <Grid cols={cols}>
        <Tile hot label="Max height AGL" value={formatMetres(L.maxHeightM)} unit="m" />
        <Tile hot label="From people" value={formatMetres(L.peopleM)} unit="m" />
        <Tile label="Crewed aircraft vertical" value={formatMetres(L.verticalFt)} unit="ft" />
        <Tile label="Crewed aircraft horizontal" value={formatMetres(L.horizontalM)} unit="m" />
      </Grid>
      <AircraftTiles aircraft={version.aircraft} onOpenSettings={openSettings} />
      {error ? <Callout title="Profiles" tone="danger">{error}</Callout> : null}
    </View>
  );
}
