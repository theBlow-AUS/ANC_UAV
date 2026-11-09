import { router } from 'expo-router';
import { ActionButton, Badge, Callout, Grid, Hazard, Screen, Tile } from '@/components/FieldKit';
import { AircraftTiles } from '@/components/AircraftKit';
import { CallButton } from '@/components/CallButton';
import { PriorityRail } from '@/components/PriorityRail';
import { useAppData } from '@/context/AppDataContext';
import { useUi } from '@/hooks/useUi';
import { EMERGENCY } from '@/lib/ui-store';

export default function AviateScreen() {
  const ui = useUi();
  const { storageError } = useAppData();
  const cols = ui.wide ? 4 : 2;

  return (
    <Screen eyebrow="Fly the aircraft first · UAV / RPAS" title="Aviate">
      <PriorityRail current="aviate" />
      <CallButton contact={EMERGENCY} />
      {storageError ? <Callout title="Local storage issue" tone="danger">{storageError}</Callout> : null}
      {ui.storageError ? <Callout title="Preferences not saved" tone="danger">{ui.storageError}</Callout> : null}
      <Badge tone="warning">QRG MOCKUP FIGURES · UNVERIFIED</Badge>
      <Grid cols={cols}>
        <Tile hot label="Max height AGL (mockup)" value="120" unit="m" />
        <Tile hot label="From people (mockup)" value="30" unit="m" />
        <Tile label="Crewed aircraft vertical" value="500" unit="ft" note="Mockup figure" />
        <Tile label="Crewed aircraft horizontal" value="1500" unit="m" note="Mockup figure" />
      </Grid>
      <AircraftTiles />
      <Hazard title="Crewed aircraft nearby">The mockup says: if horizontal separation is lost, descend to the lowest safe altitude or land. Confirm the controlled procedure.</Hazard>
      <ActionButton secondary icon="radio" label="Traffic call script" onPress={() => router.navigate({ pathname: '/comms', params: { sc: 'air' } })} />
      <ActionButton secondary icon="book-open" label="Full quick reference" onPress={() => router.push('/quick-reference')} />
      <Callout title="Reference only">General reference figures come from the unverified QRG mockup. Aircraft distances are operator-configured, with unverified starter values. Neither authorises a flight. Confirm against your current operations manual, agency procedures and aircraft documentation.</Callout>
    </Screen>
  );
}
