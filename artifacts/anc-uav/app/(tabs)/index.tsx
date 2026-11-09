import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useWindowDimensions, View, Text } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading } from '../../components/FieldKit';
import { useColors } from '../../hooks/useColors';
import { useAppData } from '../../context/AppDataContext';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const { activePack, packs, localDocuments, incidentFrequencies, storageError } = useAppData();
  const wide = width >= 720;

  return (
    <Screen
      eyebrow="Aviate. Navigate. Communicate."
      title="Field kit"
      subtitle="Offline-first RPAS references and local tools"
    >
      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary }}>
              LOCAL DEVICE ONLY
            </Text>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.foreground }}>
              No server connection
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: colors.mutedForeground }}>
              Core tools work locally. No Replit services are called by this app.
            </Text>
          </View>
          <Feather name="wifi-off" size={24} color={colors.primary} />
        </View>
      </Panel>

      {storageError ? <Callout title="Local storage issue" tone="danger">{storageError}</Callout> : null}
      <Callout title="Reference only — verify before operations">
        The supplied RFS quick-reference is a mockup and its approval is not confirmed. This app does not authorize a flight or replace current procedures.
      </Callout>

      <SectionHeading title="Active content pack" detail="Content scope is separate from the app itself." />
      <Panel>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>{activePack.name}</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              {activePack.issuer} · {activePack.jurisdiction.region}
            </Text>
          </View>
          <Badge tone="warning">{activePack.isBuiltIn ? 'REVIEW REQUIRED' : 'UNVERIFIED'}</Badge>
        </View>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          {activePack.version} · {packs.length} pack{packs.length === 1 ? '' : 's'} installed · {localDocuments.length} local document{localDocuments.length === 1 ? '' : 's'}
        </Text>
        <ActionButton label="Manage packs" icon="layers" secondary onPress={() => router.push('/library')} />
      </Panel>

      <SectionHeading title="Quick actions" detail="Open a tool without leaving the field kit." />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12, flexWrap: 'wrap' }}>
        <Panel style={{ flex: 1, minWidth: wide ? '46%' : undefined }}>
          <Feather name="book-open" size={21} color={colors.primary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Quick Reference</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            Fly, navigate, communicate, and administer from the supplied two-sided mockup.
          </Text>
          <ActionButton label="Open QRG" icon="arrow-up-right" onPress={() => router.push('/quick-reference')} />
        </Panel>
        <Panel style={{ flex: 1, minWidth: wide ? '46%' : undefined }}>
          <Feather name="crosshair" size={21} color={colors.accent} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Measure a position</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            Use device GPS or coordinates to calculate distance and true bearing.
          </Text>
          <ActionButton label="Open measurement" icon="arrow-up-right" secondary onPress={() => router.push('/map')} />
        </Panel>
        <Panel style={{ flex: 1, minWidth: wide ? '46%' : undefined }}>
          <Feather name="radio" size={21} color={colors.primary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Communications</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            Keep jurisdiction defaults, incident assignments, and CTAF sources distinct.
          </Text>
          <ActionButton label="Open communications" icon="arrow-up-right" onPress={() => router.push('/comms')} />
        </Panel>
        <Panel style={{ flex: 1, minWidth: wide ? '46%' : undefined }}>
          <Feather name="check-square" size={21} color={colors.accent} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Checklists</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            Checklist content stays read-only until its source and approval are confirmed.
          </Text>
          <ActionButton label="View checklists" icon="arrow-up-right" secondary onPress={() => router.push('/checklists')} />
        </Panel>
      </View>

      <SectionHeading title="Data coverage" />
      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Feather name="alert-circle" size={18} color={colors.accent} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground }}>
            No verified aerodrome or airspace frequency dataset is installed.
          </Text>
        </View>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Nearest-aerodrome lookup and map taps need a licensed offline data pack. Distance and direction can still be calculated from entered coordinates or current GPS.
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          {incidentFrequencies.length} operator-recorded incident assignment{incidentFrequencies.length === 1 ? '' : 's'} stored locally.
        </Text>
      </Panel>

      <SectionHeading title="Device security" detail="Credentials are stored in the device's protected storage." />
      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="lock" size={19} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.foreground }}>
            Secure account vault
          </Text>
        </View>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          No provider sign-in or download adapter is active in this first iteration.
        </Text>
        <ActionButton label="Open secure vault" icon="lock" secondary onPress={() => router.push('/accounts')} />
      </Panel>
    </Screen>
  );
}
