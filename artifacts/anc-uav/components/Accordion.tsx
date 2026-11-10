import { Feather } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DISPLAY } from './FieldKit';
import { useColors } from '../hooks/useColors';
import { useUi } from '../hooks/useUi';

/**
 * Collapsible section. Bodies stay mounted when collapsed (display:none) so
 * forms, results and permission state persist across toggles.
 */
export function Accordion({ title, summary, defaultOpen = false, children, testID, icon }: {
  title: string; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode; testID?: string;
  icon?: ComponentProps<typeof Feather>['name'];
}) {
  const c = useColors();
  const ui = useUi();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View testID={testID} style={{ marginBottom: 10, backgroundColor: c.card, borderLeftWidth: 4, borderLeftColor: open ? c.signal : c.ink }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={open ? 'Collapse section' : 'Expand section'}
        testID={testID ? `${testID}-toggle` : undefined}
        hitSlop={4}
        onPress={() => setOpen(o => !o)}
        style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}
      >
        {icon ? <Feather name={icon} size={20} color={c.foreground} /> : null}
        <Text style={{ flex: 1, flexShrink: 1, color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), lineHeight: Math.ceil(ui.fs(22) * 1.2), textTransform: 'uppercase' }}>{title}</Text>
        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.ink }}>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.foreground} />
        </View>
      </Pressable>
      {summary ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 10, marginTop: -2, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {typeof summary === 'string'
            ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '700' }}>{summary}</Text>
            : summary}
        </View>
      ) : null}
      <View
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        aria-hidden={!open}
        style={{ display: open ? 'flex' : 'none', paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2, borderTopWidth: 2, borderTopColor: c.border }}
      >
        <View style={{ paddingTop: 10 }}>{children}</View>
      </View>
    </View>
  );
}
