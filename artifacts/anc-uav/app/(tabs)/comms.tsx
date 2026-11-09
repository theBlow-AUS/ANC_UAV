import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading, TextField } from '../../components/FieldKit';
import { NSW_FCTAF_REFERENCE, RFS_PACK_ID } from '../../data/rfs-pack';
import { useAppData } from '../../context/AppDataContext';
import { useColors } from '../../hooks/useColors';

export default function CommunicationsScreen() {
  const colors = useColors();
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [bearing, setBearing] = useState('');
  const [landmark, setLandmark] = useState('');
  const [duration, setDuration] = useState('');
  const [script, setScript] = useState('');
  const { activePack, incidentFrequencies, removeIncidentFrequency } = useAppData();
  const isRfsPack = activePack.packId === RFS_PACK_ID;
  const visibleAssignments = useMemo(
    () => incidentFrequencies.filter((item) => item.packId === activePack.id),
    [incidentFrequencies, activePack.id],
  );

  function buildScript() {
    const place = location.trim() || '[Location]';
    const next = `${place} Traffic, Uncrewed RPA, operating ${distance.trim() || '[distance]'} at ${bearing.trim() || '[bearing]'} from ${landmark.trim() || '[aerodrome / landmark]'}, surface to 400 feet. Operations continuing for the next ${duration.trim() || '[duration]'}, ${place}.`;
    setScript(next);
  }

  async function copyScript() {
    if (!script) return;
    try {
      await Clipboard.setStringAsync(script);
      Alert.alert('Copied', 'The draft script was copied to the device clipboard.');
    } catch {
      Alert.alert('Copy unavailable', 'Select and copy the draft text manually.');
    }
  }

  return (
    <Screen
      eyebrow={`${activePack.jurisdiction.region} · ${activePack.name}`}
      title="Communicate"
      subtitle="Keep FCTAF, CTAF, and other ATS sources separate."
    >
      <Callout title="Verify before transmitting">
        No authoritative aerodrome CTAF or airspace frequency dataset is installed. The supplied QRG scripts and NSW reference below are shown for review, not as an operating clearance.
      </Callout>

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

      <SectionHeading title="Airspace / broadcast-area frequencies" />
      <Panel>
        <Badge tone="warning">DATASET NOT INSTALLED</Badge>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Geographic, altitude, time, and service conditions are not available in this first iteration. Other ATS frequencies will not be mislabeled as CTAFs.
        </Text>
      </Panel>

      <SectionHeading title="CTAF / blind-broadcast draft" detail="Template from the supplied unapproved mockup." />
      <Panel>
        <Badge tone="warning">VERIFY SCRIPT AND CONDITIONS</Badge>
        <TextField label="Aircraft location" value={location} onChangeText={setLocation} placeholder="Location" testID="script-location" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Distance" value={distance} onChangeText={setDistance} placeholder="3 NM" testID="script-distance" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Bearing" value={bearing} onChangeText={setBearing} placeholder="true bearing" testID="script-bearing" />
          </View>
        </View>
        <TextField label="Aerodrome / landmark" value={landmark} onChangeText={setLandmark} placeholder="Reference point" testID="script-landmark" />
        <TextField label="Expected duration" value={duration} onChangeText={setDuration} placeholder="Duration" testID="script-duration" />
        <ActionButton label="Build draft script" icon="edit-3" onPress={buildScript} testID="build-radio-script" />
        {script ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, lineHeight: 22, color: colors.foreground }}>{script}</Text>
            <ActionButton label="Copy draft text" icon="copy" secondary onPress={copyScript} testID="copy-radio-script" />
          </View>
        ) : null}
      </Panel>
    </Screen>
  );
}
