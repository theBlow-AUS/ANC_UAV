import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Hazard, Panel, Screen, SectionHeading } from '@/components/FieldKit';
import { PriorityRail } from '@/components/PriorityRail';
import { RadioScripts } from '@/components/RadioScripts';
import { FrequencyLookup } from '@/components/FrequencyLookup';
import { NSW_FCTAF_REFERENCE, RFS_PACK_ID } from '@/data/rfs-pack';
import { useAppData } from '@/context/AppDataContext';
import { useColors } from '@/hooks/useColors';

export default function CommunicationsScreen() {
  const colors = useColors();
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
        No authoritative aerodrome CTAF or airspace frequency dataset is installed. The supplied QRG scripts and NSW reference below are shown for review, not as an operating clearance.
      </Callout>

      <PriorityRail current="comms" />
      <SectionHeading title="Radio scripts" detail="Callsign is “Uncrewed RPA”. Report the aircraft’s position, not yours." />
      <RadioScripts />
      <Hazard title="Loss of tower comms">The mockup says: land immediately and use a mobile phone to contact the tower. Confirm the controlled procedure.</Hazard>

      <SectionHeading title="Incident / sector FCTAF" detail="A received assignment is separate from a statewide reference." />
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

      <SectionHeading title="Aerodrome CTAFs" detail="Normal CTAFs are not replaced by an FCTAF." />
      <Panel>
        <Badge tone="warning">DATASET NOT INSTALLED</Badge>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Automatic nearby aerodrome CTAF results need an approved aerodrome and frequency dataset with applicability coverage. A nearest-airport record alone is insufficient.
        </Text>
      </Panel>

      <FrequencyLookup />

      <SectionHeading title="Airspace / broadcast-area frequencies" />
      <Panel>
        <Badge tone="warning">DATASET NOT INSTALLED</Badge>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Geographic, altitude, time, and service conditions are not available in this first iteration. Other ATS frequencies will not be mislabeled as CTAFs.
        </Text>
      </Panel>

    </Screen>
  );
}
