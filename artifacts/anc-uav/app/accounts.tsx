import { Callout, Screen } from '../components/FieldKit';

export default function AccountsScreen() {
  return (
    <Screen eyebrow="Feature disabled" title="Provider Access" subtitle="Provider connection and credential tools are turned off." back>
      <Callout title="Provider Access is off">
        Provider connections, downloads, credential access and vault management are unavailable in this app. Existing secure-storage values are retained and are not accessed or deleted. This screen makes no provider requests.
      </Callout>
    </Screen>
  );
}
