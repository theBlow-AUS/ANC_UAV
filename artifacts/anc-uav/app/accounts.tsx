import { router } from 'expo-router';
import { ActionButton, Callout, Panel, Screen } from '../components/FieldKit';
import { Text } from 'react-native';
import { useColors } from '../hooks/useColors';

export default function AccountsScreen() {
  const colors = useColors();
  return (
    <Screen eyebrow="Feature disabled" title="Provider Access" subtitle="Provider connection and credential tools are turned off." back>
      <Callout title="Provider Access is off">
        Provider connections, downloads, credential access and vault management are unavailable in this app.
      </Callout>
      <Panel>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>
          Any credentials previously saved in the device’s secure storage have been retained and were not accessed or deleted. This feature makes no provider requests.
        </Text>
      </Panel>
      <ActionButton label="Return to Settings" icon="sliders" onPress={() => router.replace('/(tabs)/settings')} />
    </Screen>
  );
}
