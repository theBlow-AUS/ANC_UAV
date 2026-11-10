import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Hazard, Panel, Screen, SectionHeading } from '@/components/FieldKit';
import { PriorityRail } from '@/components/PriorityRail';
import { RadioScripts } from '@/components/RadioScripts';
import { FrequencyLookup } from '@/components/FrequencyLookup';
import { CommunityFrequencies } from '@/components/CommunityFrequencies';
import { Accordion } from '@/components/Accordion';
import { NSW_FCTAF_REFERENCE, RFS_PACK_ID } from '@/data/rfs-pack';
import { useAppData } from '@/context/AppDataContext';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from '@/context/NavigationContext';

export default function CommunicationsScreen() {
  const colors = useColors();
  const { packs } = useNavigation();
  const importedOtherRecords = packs.reduce((n, p) => n + p.frequencies.filter(f => f.service !== 'CTAF').length, 0);
  const { activePack, incidentFrequencies, removeIncidentFrequency } = useAppData();
  const isRfsPack = activePack.isBuiltIn && activePack.id === RFS_PACK_ID;
  const visibleAssignments = useMemo(
    () => incidentFrequencies.filter((item) => item.packId === activePack.id),
    [incidentFrequencies, activePack.id],
  );

  return (
    <Screen
      eyebrow={`${activePack.jurisdiction.region} · ${activePack.name}`}
      title="Communicate"
      subtitle="Keep FCTAF, CTAF, and other ATS sources separate."
    >
      <Callout title="Verify before transmitting">
        Community airport frequency records (OurAirports, public domain) are installed but unverified, with unknown effective dates. No authoritative national airspace dataset is bundled; any imported spatial rules are listed separately below. The QRG scripts and NSW reference are shown for review, not as an operating clearance.
      </Callout>

      <PriorityRail current="comms" />
      <ActionButton label="Airport frequency lookup" icon="radio" secondary onPress={() => router.push('/airport-frequencies')} />
      <SectionHeading title="Radio scripts" detail="Callsign is “Uncrewed RPA”. Report the aircraft’s position, not yours." />
      <RadioScripts />
      <Hazard title="Loss of tower comms">The mockup says: land immediately and use a mobile phone to contact the tower. Confirm the controlled procedure.</Hazard>

      <SectionHeading title="Frequencies & coverage" detail="Tap a section to expand. Recorded assignments stay listed in the summary." />
      <Accordion title="Incident / sector FCTAF" icon="flag" testID="acc-incident" defaultOpen={visibleAssignments.length > 0} summary={<>
        <Badge tone={visibleAssignments.length ? 'warning' : 'muted'}>{visibleAssignments.length ? `${visibleAssignments.length} RECORDED · NOT VERIFIED` : 'NONE RECORDED'}</Badge>
        {visibleAssignments.map((a) => <Badge key={a.id} tone="warning">{`${a.incident} · ${a.frequencyMHz} MHz${a.sector ? ' · ' + a.sector : ''}`}</Badge>)}
      </>}>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground, marginBottom: 8 }}>A received assignment is separate from a statewide reference.</Text>
      <Panel>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>Operator-recorded assignments</Text>
        {visibleAssignments.length ? (
          visibleAssignments.map((assignment) => (
            <View key={assignment.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
                  {assignment.frequencyMHz} MHz
                </Text>
                <Badge tone="warning">NOT VERIFIED</Badge>
              </View>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                {assignment.incident}{assignment.sector ? ` · ${assignment.sector}` : ''}
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
                Entered by operator · assigned by: {assignment.assignedBy || 'not recorded'} · validity: {assignment.validity || 'not recorded'}
              </Text>
              <ActionButton label="Remove local entry" icon="trash-2" secondary onPress={() => {
                Alert.alert('Remove assignment?', 'This removes only the local operator-entered note.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => void removeIncidentFrequency(assignment.id) },
                ]);
              }} />
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            No incident assignment has been recorded for this content-pack context.
          </Text>
        )}
        <ActionButton label="Record received assignment" icon="plus" onPress={() => router.push('/add-assignment')} testID="add-fctaf-assignment" />
        <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
          This records information you received; ANC UAV does not allocate or infer an incident frequency.
        </Text>
      </Panel>

      </Accordion>
      <Accordion title="Statewide reference" icon="map" testID="acc-statewide" summary={isRfsPack ? <><Badge tone="warning">SCOPE-LIMITED</Badge><Badge>{`${NSW_FCTAF_REFERENCE.frequencyMHz} MHz`}</Badge></> : <Badge>NONE IN THIS PACK</Badge>}>
      {isRfsPack ? (
        <Panel>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.foreground }}>{NSW_FCTAF_REFERENCE.label}</Text>
            <Badge tone="warning">SCOPE-LIMITED</Badge>
          </View>
          <Text style={{ fontSize: 25, fontWeight: '700', color: colors.primary }}>
            {NSW_FCTAF_REFERENCE.frequencyMHz} MHz
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>{NSW_FCTAF_REFERENCE.scope}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{NSW_FCTAF_REFERENCE.source}</Text>
          <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: '600', color: colors.mutedForeground }}>{NSW_FCTAF_REFERENCE.status}</Text>
        </Panel>
      ) : (
        <Callout title="No statewide reference in this pack">
          The selected pack is not the NSW RFS launch pack. No other jurisdiction's FCTAF default is assumed.
        </Callout>
      )}

      </Accordion>
      <Accordion title="Community airport frequencies" icon="radio" testID="acc-community" summary={<Badge tone="warning">OURAIRPORTS · UNVERIFIED</Badge>}>
        <CommunityFrequencies />
      </Accordion>
      <Accordion title="Spatial frequency lookup" icon="crosshair" testID="acc-lookup" summary="Applicability by position, altitude and time.">
        <FrequencyLookup />
      </Accordion>
      <Accordion title="Airspace / broadcast-area coverage" icon="layers" testID="acc-coverage" summary={<Badge tone="warning">{importedOtherRecords ? `${importedOtherRecords} IMPORTED · UNVERIFIED` : 'SPATIAL DATA NOT IMPORTED'}</Badge>}>
      <Panel>
        <Badge tone="warning">{importedOtherRecords ? `${importedOtherRecords} IMPORTED ATS RECORDS · UNVERIFIED` : 'AIRSPACE / ATS SPATIAL DATA NOT IMPORTED'}</Badge>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          {importedOtherRecords
            ? 'Imported ATS records are evaluated in the applicability lookup, including their geometry, altitude, time and source conditions. They do not establish complete national coverage. Community airport records do not fill gaps in those rules.'
            : 'The community CSV files do not provide airspace or broadcast-area applicability boundaries, altitude bands or operating schedules. No national coverage is claimed. Import a separately authorized spatial pack to evaluate those conditions.'}
        </Text>
      </Panel>

      </Accordion>
    </Screen>
  );
}
