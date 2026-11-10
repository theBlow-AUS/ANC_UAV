import { router } from 'expo-router';
import { ActionButton, Body, Callout, Screen } from '@/components/FieldKit';
import { Accordion } from '@/components/Accordion';
import { PriorityRail } from '@/components/PriorityRail';
import { QUICK_REFERENCE } from '@/data/rfs-pack';

export default function NavigateScreen() {
  const ref = QUICK_REFERENCE.fly.filter((s) => s.heading === 'Navigate' || s.heading === 'Weather shorthand');

  return (
    <Screen eyebrow="Position and reference" title="Navigate">
      <PriorityRail current="navigate" />
      <ActionButton icon="map" label="Open map measurements" onPress={() => router.navigate('/map')} />
      <ActionButton secondary icon="tool" label="Open converters and tools" onPress={() => router.navigate('/tools')} />
      <Callout title="Reference only">Draft legend and shorthand, not a live airspace dataset. Confirm against current charts, NOTAMs and approved procedures.</Callout>
      {ref.map(sec => <Accordion key={sec.heading} title={sec.heading === 'Navigate' ? 'Navigation reference' : sec.heading}
        summary="Unverified source · review against approved documents" icon={sec.heading === 'Navigate' ? 'compass' : 'cloud'}>
        {sec.entries.map(([k, val]) => <Body key={k}>{`${k}: ${val}`}</Body>)}
      </Accordion>)}
      <ActionButton secondary icon="book-open" label="Full quick reference" onPress={() => router.push('/quick-reference')} />
    </Screen>
  );
}
