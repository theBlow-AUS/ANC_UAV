import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { DISPLAY } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { cleanDialString, type Contact } from '@/lib/ui-store';

/**
 * Two-step call: first tap arms, second tap dials. Prevents pocket or glove dials.
 * Works on web too (no Alert dependency).
 */
export function CallButton({ contact, onRemove }: { contact: Contact; onRemove?: () => void }) {
  const c = useColors();
  const ui = useUi();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emergency = contact.id === '000';
  const dial = cleanDialString(contact.number);

  async function place() {
    if (!dial) { setError('Number is not a valid dial string.'); return; }
    try {
      await Linking.openURL(`tel:${dial}`);
      setArmed(false);
    } catch {
      setError('This device cannot start a phone call.');
    }
  }

  const bg = armed ? c.signal : emergency ? c.destructive : c.card;
  const fg = armed ? c.onSignal : emergency ? c.destructiveForeground : c.foreground;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={armed ? `Confirm call to ${contact.name}` : `Prepare call to ${contact.name}`}
          testID={`call-${contact.id}`}
          onPress={() => { setError(null); if (armed) void place(); else setArmed(true); }}
          style={({ pressed }) => ({ flex: 1, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: bg, borderLeftWidth: 8, borderLeftColor: c.ink, opacity: pressed ? 0.8 : 1 })}
        >
          <Feather name={armed ? 'phone-outgoing' : 'phone'} size={22} color={fg} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: fg, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(24), textTransform: 'uppercase' }}>
              {armed ? `Tap again to call` : contact.name}
            </Text>
            {armed ? <Text style={{ color: fg, fontSize: ui.fs(14), fontWeight: '700' }}>{contact.name}</Text> : null}
          </View>
          <Text style={{ backgroundColor: c.ink, color: c.background, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(24), paddingHorizontal: 10, paddingVertical: 6 }}>{contact.number}</Text>
        </Pressable>
        {armed ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel call" onPress={() => setArmed(false)}
            style={{ width: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary }}>
            <Feather name="x" size={24} color={c.foreground} />
          </Pressable>
        ) : onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${contact.name}`} testID={`remove-${contact.id}`} onPress={onRemove}
            style={{ width: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary }}>
            <Feather name="trash-2" size={22} color={c.foreground} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: c.destructive, fontSize: ui.fs(14), fontWeight: '700', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
