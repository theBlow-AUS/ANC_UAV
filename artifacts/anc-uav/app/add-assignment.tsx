import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ActionButton, Callout, Panel, Screen, TextField } from '../components/FieldKit';
import { useAppData } from '../context/AppDataContext';

export default function AddAssignmentScreen() {
  const { activePack, addIncidentFrequency } = useAppData();
  const [incident, setIncident] = useState('');
  const [sector, setSector] = useState('');
  const [frequencyMHz, setFrequencyMHz] = useState('');
  const [assignedBy, setAssignedBy] = useState('');
  const [validity, setValidity] = useState('');

  async function save() {
    const frequency = frequencyMHz.trim();
    if (!incident.trim() || !frequency || !Number.isFinite(Number(frequency)) || Number(frequency) <= 0) {
      Alert.alert('Check the details', 'Enter an incident name and a positive frequency in MHz.');
      return;
    }
    await addIncidentFrequency({
      id: `assignment-${Date.now().toString(36)}`,
      packId: activePack.id,
      incident: incident.trim(),
      sector: sector.trim(),
      frequencyMHz: Number(frequency).toFixed(3),
      assignedBy: assignedBy.trim(),
      validity: validity.trim(),
      enteredAt: new Date().toISOString(),
    });
    router.back();
  }

  return (
    <Screen
      eyebrow="Local incident note"
      title="Record FCTAF"
      subtitle={`Stored under ${activePack.name}`}
      back
    >
      <Callout title="Record only — does not assign or verify">
        Enter a frequency received from the authorized incident source. This app does not allocate frequencies or confirm an assignment.
      </Callout>
      <Panel>
        <TextField label="Incident name" value={incident} onChangeText={setIncident} placeholder="Incident" testID="assignment-incident" />
        <TextField label="Sector / group" value={sector} onChangeText={setSector} placeholder="Optional" testID="assignment-sector" />
        <TextField label="Frequency (MHz)" value={frequencyMHz} onChangeText={setFrequencyMHz} placeholder="132.550" keyboardType="decimal-pad" testID="assignment-frequency" />
        <TextField label="Assigned by" value={assignedBy} onChangeText={setAssignedBy} placeholder="Name or role; optional" testID="assignment-authority" />
        <TextField label="Validity / review time" value={validity} onChangeText={setValidity} placeholder="As advised; optional" testID="assignment-validity" />
        <ActionButton label="Save local note" icon="save" onPress={save} testID="save-assignment" />
      </Panel>
    </Screen>
  );
}
