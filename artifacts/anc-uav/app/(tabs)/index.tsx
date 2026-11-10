import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { ActionButton, Callout, DISPLAY, Hazard, Screen } from '@/components/FieldKit';
import { ActiveProfile } from '@/components/ActiveProfile';
import { PriorityRail } from '@/components/PriorityRail';
import { useAppData } from '@/context/AppDataContext';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { UavWeather } from '@/components/UavWeather';

export default function AviateScreen() {
  const ui = useUi();
  const c = useColors();
  const { internalComms } = useLocalSearchParams<{ internalComms?: string }>();
  const crewComms = ui.crew === 'multi' && internalComms === '1';
  const { storageError } = useAppData();
  useEffect(() => {
    if (ui.crew !== 'multi' && internalComms) router.setParams({ internalComms: undefined });
  }, [ui.crew, internalComms]);

  return (
    <Screen eyebrow="Aviate the aircraft first · UAV / RPAS" title="Aviate">
      <PriorityRail current={crewComms ? 'comms' : 'aviate'} selectedIndex={crewComms ? 0 : undefined} />
      {crewComms ? <View accessibilityRole="text" style={{ width: '100%', minHeight: 72, justifyContent: 'center', padding: 16, marginBottom: 12, backgroundColor: c.signal, borderLeftWidth: 8, borderLeftColor: c.ink }}>
        <Text style={{ color: c.onSignal, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(20), lineHeight: ui.fs(25) }}>
          Communicate internally, with your crew, constantly.
        </Text>
      </View> : null}
      {storageError ? <Callout title="Local storage issue" tone="danger">{storageError}</Callout> : null}
      {ui.storageError ? <Callout title="Preferences not saved" tone="danger">{ui.storageError}</Callout> : null}
      <ActiveProfile />
      <Hazard title="Crewed aircraft nearby">The mockup says: if horizontal separation is lost, descend to the lowest safe altitude or land. Confirm the controlled procedure.</Hazard>
      <UavWeather />
      <ActionButton secondary icon="radio" label="Traffic call script" onPress={() => router.navigate({ pathname: '/comms', params: { sc: 'air' } })} />
      <ActionButton secondary icon="book-open" label="Full quick reference" onPress={() => router.push('/quick-reference')} />
      <Callout title="Reference only">Limits and aircraft distances above come from the operating profile version selected in Settings. They are entered by an operator, not checked by this app, and may still hold starter values. They do not authorise a flight or show an approval. Confirm against your current operations manual, agency procedures and aircraft documentation.</Callout>
    </Screen>
  );
}
