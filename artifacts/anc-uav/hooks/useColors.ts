import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { useUiStore } from '@/lib/ui-store';

/** Day / Night palette. Follows the device in Auto, or the Settings override. */
export function useColors() {
  const system = useColorScheme();
  const { theme } = useUiStore();
  const dark = theme === 'auto' ? system === 'dark' : theme === 'night';
  return { ...(dark ? colors.dark : colors.light), radius: colors.radius, dark };
}
