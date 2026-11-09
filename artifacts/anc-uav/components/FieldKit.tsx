import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { router } from 'expo-router';
import { Children, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tone = 'warning' | 'muted' | 'good' | 'danger';
export const DISPLAY = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: '"Barlow Condensed","Arial Narrow",Impact,sans-serif',
}) as string;

/** Page background coloured corner that "cuts" the top-right of a block. */
function Notch({ size = 16 }: { size?: number }) {
  const c = useColors();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTopWidth: size, borderLeftWidth: size, borderTopColor: c.background, borderLeftColor: 'transparent' }} />;
}

export function Screen({ title, subtitle, eyebrow, back = false, children }: {
  title: string; subtitle?: string; eyebrow?: string; back?: boolean; children: ReactNode;
}) {
  const c = useColors();
  const ui = useUi();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top + 12) : insets.top + 12, paddingBottom: Platform.OS === 'web' ? 40 : Math.max(28, insets.bottom + 12), paddingHorizontal: ui.tablet ? 28 : 14, alignItems: 'center' }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 1100 }}>
        <View style={s.headingRow}>
          <View style={{ flex: 1, gap: 4 }}>
            {eyebrow ? <Text style={[s.eyebrow, { color: c.mutedForeground, fontSize: ui.fs(14) }]}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={[s.title, { color: c.foreground, fontSize: ui.fs(ui.tablet ? 56 : 46), lineHeight: Math.ceil(ui.fs(ui.tablet ? 56 : 46) * 1.2) }]}>{title}</Text>
            {subtitle ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(16), fontWeight: '700' }}>{subtitle}</Text> : null}
          </View>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" testID="back-button" onPress={() => router.back()}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.ink }}>
              <Feather name="arrow-left" size={24} color={c.foreground} />
            </Pressable>
          ) : null}
        </View>
        {children}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return (
    <View style={[s.panel, { backgroundColor: c.card, borderLeftColor: c.ink }, style]}>
      <Notch />
      {children}
    </View>
  );
}

/** Responsive grid: `cols` equal columns with gutters. */
export function Grid({ cols, gap = 10, children }: { cols: number; gap?: number; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, marginBottom: 6 }}>
      {Children.toArray(children).map((ch, i) => (
        <View key={i} style={{ width: `${100 / cols}%` as `${number}%`, paddingHorizontal: gap / 2 }}>{ch}</View>
      ))}
    </View>
  );
}

/** Big-number tile. */
export function Tile({ label, value, unit, note, hot = false }: { label: string; value: string; unit?: string; note?: string; hot?: boolean }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View style={[s.panel, { backgroundColor: c.card, borderLeftColor: hot ? c.signal : c.ink }]}>
      <Notch />
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(15), fontWeight: '700' }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3} style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(58), lineHeight: Math.ceil(ui.fs(58) * 1.3), paddingTop: 2, paddingRight: 6, textTransform: 'uppercase' }}>
        {value}{unit ? <Text style={{ fontSize: ui.fs(24) }}> {unit}</Text> : null}
      </Text>
      {note ? <Text style={{ color: c.foreground, fontSize: ui.fs(14), fontWeight: '700' }}>{note}</Text> : null}
    </View>
  );
}

/** Stop / caution / go result. Always glyph + word, never colour alone. */
export function Verdict({ tone, glyph, title, text, children }: { tone: 'info' | 'go' | 'warn' | 'stop'; glyph: string; title: string; text: string; children?: ReactNode }) {
  const c = useColors();
  const ui = useUi();
  const [bg, fg] = tone === 'stop' ? [c.destructive, c.destructiveForeground] : tone === 'warn' ? [c.signal, c.onSignal] : tone === 'go' ? [c.go, c.goForeground] : [c.card, c.foreground];
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderWidth: tone === 'info' ? 3 : 0, borderColor: c.ink, padding: 14, gap: 6, marginBottom: 12 }}>
      <Text style={{ color: fg, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(38), lineHeight: Math.ceil(ui.fs(38) * 1.2), textTransform: 'uppercase' }}>{glyph} {title}</Text>
      <Text style={{ color: fg, fontSize: ui.fs(16), fontWeight: '700' }}>{text}</Text>
      {children}
    </View>
  );
}

/** Hazard-striped critical panel. */
export function Hazard({ title, children }: { title: string; children: string }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View style={{ marginBottom: 12, backgroundColor: c.card, borderWidth: 3, borderColor: c.ink }}>
      <View style={{ flexDirection: 'row', height: 12, overflow: 'hidden' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? c.hazardDark : c.signal, transform: [{ skewX: '-40deg' }] }} />
        ))}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ color: c.destructive, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(30), textTransform: 'uppercase' }}>▲ {title}</Text>
        <Text style={{ color: c.foreground, fontSize: ui.fs(17), fontWeight: '700' }}>{children}</Text>
      </View>
    </View>
  );
}

/** Segmented control, 48 px tall for gloved hands. */
export function Seg<T extends string | number>({ options, value, onChange, label }: { options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label?: string }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View style={{ marginBottom: 12, gap: 4 }}>
      {label ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', borderWidth: 3, borderColor: c.ink }}>
        {options.map(([k, text]) => {
          const on = k === value;
          return (
            <Pressable key={String(k)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(k)}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', paddingHorizontal: 6 }}>
              <Text style={{ color: on ? c.background : c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(19), textTransform: 'uppercase' }}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View style={{ marginTop: 12, marginBottom: 8, gap: 2 }}>
      <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(30), textTransform: 'uppercase' }}>{title}</Text>
      {detail ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{detail}</Text> : null}
    </View>
  );
}

export function Badge({ children, tone = 'muted' }: { children: string; tone?: Tone }) {
  const c = useColors();
  const [bg, fg] = { warning: [c.signal, c.onSignal], muted: [c.secondary, c.secondaryForeground], good: [c.go, c.goForeground], danger: [c.destructive, c.destructiveForeground] }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontFamily: DISPLAY, fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }}>{children}</Text>
    </View>
  );
}

export function Callout({ title, children, tone = 'warning' }: { title: string; children: string; tone?: Tone }) {
  const c = useColors();
  const ui = useUi();
  const edge = tone === 'danger' ? c.destructive : tone === 'good' ? c.go : c.signal;
  return (
    <View style={{ backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: edge, padding: 12, marginBottom: 12, gap: 4 }}>
      <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(20), textTransform: 'uppercase' }}>{title}</Text>
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), lineHeight: ui.fs(20), fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function ActionButton({ label, onPress, icon, secondary = false, disabled = false, testID }: {
  label: string; onPress: () => void; icon?: ComponentProps<typeof Feather>['name']; secondary?: boolean; disabled?: boolean; testID?: string;
}) {
  const c = useColors();
  const ui = useUi();
  const bg = secondary ? c.secondary : c.signal;
  const fg = secondary ? c.secondaryForeground : c.onSignal;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} testID={testID} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, backgroundColor: bg, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 10, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}>
      {icon ? <Feather name={icon} size={20} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(22), textTransform: 'uppercase' }}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  const ui = useUi();
  return (
    <View style={{ gap: 4, marginBottom: 12 }}>
      <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={c.mutedForeground} selectionColor={c.signal}
        style={[{ minHeight: 54, borderWidth: 3, borderColor: c.input, color: c.foreground, backgroundColor: c.background, paddingHorizontal: 12, fontSize: ui.fs(20), fontWeight: '800' }, style]} {...props} />
      {hint ? <Text style={{ color: c.mutedForeground, fontSize: ui.fs(13), fontWeight: '600' }}>{hint}</Text> : null}
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 2, backgroundColor: c.border, marginVertical: 6 }} />;
}

export function Body({ children, style }: { children: string; style?: object }) {
  const c = useColors();
  const ui = useUi();
  return <Text style={[{ color: c.foreground, fontSize: ui.fs(16), lineHeight: ui.fs(23), fontWeight: '600' }, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 14 },
  eyebrow: { fontWeight: '700' },
  title: { fontFamily: DISPLAY, fontWeight: '800', textTransform: 'uppercase' },
  panel: { borderLeftWidth: 8, padding: 14, marginBottom: 12, gap: 8 },
});
