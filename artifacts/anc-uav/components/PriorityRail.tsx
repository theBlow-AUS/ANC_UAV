import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DISPLAY, Seg } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { setUi } from '@/lib/ui-store';
import { useUi } from '@/hooks/useUi';

export type Step = 'aviate' | 'navigate' | 'comms' | 'admin';
const ROUTE: Record<Step, string> = { aviate: '/', navigate: '/navigate', comms: '/comms', admin: '/settings' };
const NAME: Record<Step, string> = { aviate: 'Avi', navigate: 'Nav', comms: 'Com', admin: 'Adm' };
const ORDER: Record<'solo' | 'multi', Step[]> = {
  solo: ['aviate', 'navigate', 'comms', 'admin'],
  multi: ['comms', 'aviate', 'navigate', 'comms', 'admin'],
};

/** Solo / multi-crew toggle plus the card's priority order. Tap a step to jump to it. */
export function PriorityRail({ current }: { current: Step }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View>
      <Seg label="Crew" value={ui.crew} onChange={(v) => setUi({ crew: v })} options={[['solo', 'Solo'], ['multi', 'Multi-crew']]} />
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {ORDER[ui.crew].map((k, i) => {
          const on = k === current;
          return (
            <Pressable key={`${k}${i}`} accessibilityRole="button" accessibilityLabel={`Step ${i + 1}: ${k}`} onPress={() => router.navigate(ROUTE[k] as never)}
              style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.signal : c.card }}>
              <Text style={{ color: on ? c.onSignal : c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: 17, textTransform: 'uppercase' }}>{NAME[k]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
