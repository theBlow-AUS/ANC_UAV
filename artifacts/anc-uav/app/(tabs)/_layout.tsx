import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';
import { DISPLAY } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';

const icon = (name: ComponentProps<typeof Feather>['name']) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Feather name={name} size={24} color={color as string} />;
  };

/** Classic tabs. Bottom bar on portrait phones, left rail on tablets and in landscape. */
export default function TabLayout() {
  const c = useColors();
  const ui = useUi();
  const web = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: ui.rail ? 'left' : 'bottom',
        tabBarVariant: ui.rail ? 'material' : 'uikit',
        tabBarActiveTintColor: c.onSignal,
        tabBarInactiveTintColor: c.foreground,
        tabBarActiveBackgroundColor: c.signal,
        tabBarLabelStyle: { fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.rail ? Math.round(14 * Math.min(ui.text, 1.15)) : 11, textTransform: 'uppercase' },
        tabBarStyle: {
          backgroundColor: c.background,
          borderColor: c.ink,
          borderTopWidth: ui.rail ? 0 : 4,
          borderRightWidth: ui.rail ? 4 : 0,
          elevation: 0,
          ...(web && !ui.rail ? { height: 84 } : null),
          ...(ui.rail ? { minWidth: 104 } : null),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Aviate', tabBarIcon: icon('send') }} />
      <Tabs.Screen name="navigate" options={{ title: 'Navigate', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('map') }} />
      <Tabs.Screen name="comms" options={{ title: 'Comms', tabBarIcon: icon('radio') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('sliders') }} />
      <Tabs.Screen name="library" options={{ href: null }} />
    </Tabs>
  );
}
