import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tone = 'warning' | 'muted' | 'good' | 'danger';

export function Screen({
  title,
  subtitle,
  eyebrow,
  back = false,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: boolean;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.pageContent,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(28, insets.bottom + 112),
        },
      ]}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.contentWidth}>
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
            ) : null}
          </View>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID="back-button"
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.secondary }]}
            >
              <Feather name="arrow-left" size={19} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>
        {children}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function SectionHeading({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {detail ? <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
    </View>
  );
}

export function Badge({ children, tone = 'muted' }: { children: string; tone?: Tone }) {
  const colors = useColors();
  const palette = {
    warning: [colors.accent, colors.accentForeground],
    muted: [colors.secondary, colors.secondaryForeground],
    good: [colors.primary, colors.primaryForeground],
    danger: [colors.destructive, colors.destructiveForeground],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }]}>
      <Text style={[styles.badgeText, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

export function Callout({
  title,
  children,
  tone = 'warning',
}: {
  title: string;
  children: string;
  tone?: Tone;
}) {
  const colors = useColors();
  const edge = tone === 'danger' ? colors.destructive : tone === 'good' ? colors.primary : colors.accent;
  return (
    <View style={[styles.callout, { backgroundColor: colors.card, borderColor: edge }]}>
      <Text style={[styles.calloutTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Feather>['name'];
  secondary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary ? colors.secondary : colors.primary,
          opacity: disabled ? 0.5 : pressed ? 0.76 : 1,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={17} color={secondary ? colors.secondaryForeground : colors.primaryForeground} /> : null}
      <Text style={[styles.actionLabel, { color: secondary ? colors.secondaryForeground : colors.primaryForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        style={[
          styles.input,
          { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
          style,
        ]}
        {...props}
      />
      {hint ? <Text style={[styles.detail, { color: colors.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

export function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export function Body({ children, style }: { children: string; style?: object }) {
  const colors = useColors();
  return <Text style={[styles.body, { color: colors.foreground }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  pageContent: {
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  contentWidth: { width: '100%', maxWidth: 820 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 14 },
  headingText: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  panel: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14, gap: 11 },
  sectionHeading: { marginTop: 10, marginBottom: 8, gap: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  detail: { fontSize: 12, lineHeight: 17 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  callout: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 13, padding: 13, marginBottom: 14, gap: 5 },
  calloutTitle: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
  actionButton: { minHeight: 48, borderRadius: 13, paddingHorizontal: 16, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700' },
  fieldWrap: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 5 },
});
