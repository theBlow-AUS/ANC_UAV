import { router } from 'expo-router';
import { ActionButton, Callout, Hazard, Screen } from '@/components/FieldKit';
import { ActiveProfile } from '@/components/ActiveProfile';
import { CallButton } from '@/components/CallButton';
import { PriorityRail } from '@/components/PriorityRail';
import { useAppData } from '@/context/AppDataContext';
import { useUi } from '@/hooks/useUi';
import { EMERGENCY } from '@/lib/ui-store';

export default function AviateScreen() {
  const ui = useUi();
  const { storageError } = useAppData();

  return (
    <Screen eyebrow="Fly the aircraft first · UAV / RPAS" title="Aviate">
      <PriorityRail current="aviate" />
      <CallButton contact={EMERGENCY} />
      {storageError ? <Callout title="Local storage issue" tone="danger">{storageError}</Callout> : null}
      {ui.storageError ? <Callout title="Preferences not saved" tone="danger">{ui.storageError}</Callout> : null}
      <ActiveProfile />
      <Hazard title="Crewed aircraft nearby">The mockup says: if horizontal separation is lost, descend to the lowest safe altitude or land. Confirm the controlled procedure.</Hazard>
      <ActionButton secondary icon="radio" label="Traffic call script" onPress={() => router.navigate({ pathname: '/comms', params: { sc: 'air' } })} />
      <ActionButton secondary icon="book-open" label="Full quick reference" onPress={() => router.push('/quick-reference')} />
      <Callout title="Reference only">Limits and aircraft distances above come from the operating profile version selected in Settings. They are entered by an operator, not checked by this app, and may still hold starter values. They do not authorise a flight or show an approval. Confirm against your current operations manual, agency procedures and aircraft documentation.</Callout>
    </Screen>
  );
}
