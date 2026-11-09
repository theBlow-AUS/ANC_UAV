import { useWindowDimensions } from 'react-native';
import { useUiStore } from '@/lib/ui-store';

/** Phone/tablet + portrait/landscape awareness, plus the user's text scale. */
export function useUi() {
  const { width, height } = useWindowDimensions();
  const store = useUiStore();
  const landscape = width > height;
  const tablet = Math.min(width, height) >= 600;
  const wide = width >= 840;
  const side = wide || (landscape && width >= 640);
  const rail = tablet || landscape;
  return { ...store, width, height, landscape, tablet, wide, side, rail, fs: (n: number) => Math.round(n * store.text) };
}
