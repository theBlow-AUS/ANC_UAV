import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton, Badge, Callout, DISPLAY, Grid, Panel, Screen, SectionHeading, Seg, TextField } from '@/components/FieldKit';
import { AircraftEditor } from '@/components/AircraftKit';
import { CallButton } from '@/components/CallButton';
import { PriorityRail } from '@/components/PriorityRail';
import { useAppData } from '@/context/AppDataContext';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { cleanDialString, setUi } from '@/lib/ui-store';

export default function SettingsScreen() {
  const c = useColors();
  const ui = useUi();
  const { activePack, packs, localDocuments, incidentFrequencies, storageError } = useAppData();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const numberValid = cleanDialString(number) !== null;
  const canAdd = name.trim().length > 0 && numberValid && ui.hydrated;

  const add = () => {
    if (!canAdd) return;
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    setUi({ contacts: [...ui.contacts, { id, name: name.trim(), number: number.trim() }] });
    setName(''); setNumber('');
  };

  const contacts = (
    <View>
      <SectionHeading title="Administrate" detail="Key contacts. Entered by you, stored only on this device. Tap once to arm, again to call." />
      {ui.contacts.map((k) => (
        <CallButton key={k.id} contact={k}
          onRemove={k.id === '000' ? undefined : () => setUi({ contacts: ui.contacts.filter((x) => x.id !== k.id) })} />
      ))}
      <Panel>
        <TextField label="Contact name" value={name} onChangeText={setName} placeholder="Air desk, base, observer" testID="contact-name" maxLength={60} />
        <TextField label="Phone number" value={number} onChangeText={setNumber} keyboardType="phone-pad" placeholder="Digits, spaces, optional +" testID="contact-number" maxLength={24}
          hint={number.trim() && !numberValid ? 'Use 3 to 15 digits, spaces and an optional leading +.' : undefined} />
        <ActionButton icon="plus" label="Add contact" onPress={add} disabled={!canAdd} testID="add-contact" />
      </Panel>
      <AircraftEditor />
    </View>
  );

  const prefs = (
    <View>
      <SectionHeading title="Display" detail="Day is for glare. Night is for the dark. Auto follows the device." />
      <Seg label="Mode" value={ui.theme} onChange={(v) => setUi({ theme: v })} options={[['auto', 'Auto'], ['day', 'Day'], ['night', 'Night']]} />
      <Seg label="Text size" value={ui.text} onChange={(v) => setUi({ text: v })} options={[[1, 'Normal'], [1.15, 'Large'], [1.3, 'XL']]} />
      <Seg label="Default distance unit" value={ui.unit} onChange={(v) => setUi({ unit: v })} options={[['km', 'km'], ['nm', 'NM']]} />
      <Seg label="Crew priority order" value={ui.crew} onChange={(v) => setUi({ crew: v })} options={[['solo', 'Solo'], ['multi', 'Multi-crew']]} />
      {!ui.hydrated ? <Text style={{ color: c.mutedForeground, fontWeight: '700', marginBottom: 8 }}>Loading saved preferences…</Text> : null}
      <SectionHeading title="Content" />
      <Panel>
        <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(24), textTransform: 'uppercase' }}>{activePack.name}</Text>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{activePack.issuer} · {activePack.jurisdiction.region} · {activePack.version}</Text>
        <Badge tone="warning">{activePack.isBuiltIn ? 'REVIEW REQUIRED' : 'UNVERIFIED'}</Badge>
        <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '600' }}>
          {packs.length} pack{packs.length === 1 ? '' : 's'} · {localDocuments.length} local document{localDocuments.length === 1 ? '' : 's'} · {incidentFrequencies.length} recorded assignment{incidentFrequencies.length === 1 ? '' : 's'}
        </Text>
        <ActionButton icon="layers" label="Packs and library" onPress={() => router.push('/library')} testID="open-library" />
        <ActionButton secondary icon="book-open" label="Quick reference" onPress={() => router.push('/quick-reference')} />
        <ActionButton secondary icon="check-square" label="Checklists" onPress={() => router.push('/checklists')} />
        <ActionButton secondary icon="lock" label="Secure vault" onPress={() => router.push('/accounts')} />
        <ActionButton secondary icon="shield" label="Privacy" onPress={() => router.push('/privacy')} />
      </Panel>
      <Callout title="Data coverage">No verified aerodrome or airspace dataset is installed. Distances come from GPS or entered coordinates. Credentials stay in the device's protected storage.</Callout>
    </View>
  );

  return (
    <Screen eyebrow="Display, contacts, content" title="Settings">
      <PriorityRail current="admin" />
      {ui.storageError ? <Callout title="Preferences storage" tone="danger">{ui.storageError}</Callout> : null}
      {storageError ? <Callout title="App data storage" tone="danger">{storageError}</Callout> : null}
      <Grid cols={ui.wide ? 2 : 1} gap={20}>{[contacts, prefs]}</Grid>
    </Screen>
  );
}
