import { CommunityFrequencies } from '../components/CommunityFrequencies';
import { Screen } from '../components/FieldKit';

export default function AirportFrequenciesScreen() {
  return <Screen title="Radio lookup" subtitle="Offline community reference · not operational clearance" back>
    <CommunityFrequencies />
  </Screen>;
}
