import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, DISPLAY, Grid, TextField } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';

type F = [string, string];
const SCRIPTS: { id: string; t: string; w: string; f: F[]; g: (v: Record<string, string>) => string }[] = [
  { id: 'ctaf', t: 'CTAF blind broadcast', w: 'Mockup trigger (unverified): near an uncontrolled aerodrome or HLS.',
    f: [['loc', 'Location'], ['ref', 'Distance / bearing from landmark'], ['time', 'Time amount']],
    g: (v) => `${v.loc} Traffic, Uncrewed RPA, operating ${v.ref}, surface to 400 feet. Operations continuing for the next ${v.time}, ${v.loc}.` },
  { id: 'twr', t: 'Tower clearance request', w: 'Mockup trigger (unverified): near a towered aerodrome.',
    f: [['tower', 'Tower name'], ['id', 'Your name / ID'], ['loc', 'Location'], ['dur', 'Duration']],
    g: (v) => `${v.tower}, Uncrewed RPA ${v.id}, request clearance to operate at ${v.loc}, surface to 400 feet, for ${v.dur}.` },
  { id: 'air', t: 'Traffic avoidance', w: 'Crewed aircraft nearby or separation at risk.',
    f: [['cs', 'Aircraft callsign'], ['alt', 'Altitude'], ['loc', 'Location']],
    g: (v) => `${v.cs}, Uncrewed RPA, I have you on sight. I am descending to surface / holding at ${v.alt} at ${v.loc} to remain clear.` },
  { id: 'end', t: 'Operations complete', w: 'Landed and finished.', f: [['loc', 'Location']],
    g: (v) => `${v.loc} Traffic / Tower, Uncrewed RPA has landed and operations are complete, ${v.loc}.` },
];

/** The card's four radio scripts with live fill-in. Draft wording: verify against the approved local script. */
export function RadioScripts() {
  const c = useColors();
  const ui = useUi();
  const { sc } = useLocalSearchParams<{ sc?: string }>();
  const [open, setOpen] = useState<string>(sc ?? 'ctaf');
  const [lastSc, setLastSc] = useState(sc);
  if (sc !== lastSc) { setLastSc(sc); if (sc) setOpen(sc); }
  const [vals, setVals] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');

  const text = (s: (typeof SCRIPTS)[number]) =>
    s.g(Object.fromEntries(s.f.map(([k, label]) => [k, vals[s.id + k]?.trim() || `[${label}]`])));

  return (
    <View>
    <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700', marginBottom: 8 }}>Draft wording from the mockup. Verify against the approved local script before transmitting.</Text>
    <Grid cols={ui.wide ? 2 : 1}>
      {SCRIPTS.map((s) => {
        const on = open === s.id || ui.wide;
        return (
          <View key={s.id} style={{ marginBottom: 12, backgroundColor: c.card, borderLeftWidth: 8, borderLeftColor: open === s.id ? c.signal : c.ink }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(open === s.id ? '' : s.id)} style={{ padding: 14, gap: 2 }}>
              <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(28), textTransform: 'uppercase' }}>{s.t}</Text>
              <Text style={{ color: c.mutedForeground, fontSize: ui.fs(14), fontWeight: '700' }}>{s.w}</Text>
            </Pressable>
            {on ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
                {s.f.map(([k, label]) => (
                  <TextField key={k} label={label} value={vals[s.id + k] ?? ''} onChangeText={(t) => setVals((p) => ({ ...p, [s.id + k]: t }))} />
                ))}
                <Text selectable style={{ color: c.foreground, fontSize: ui.fs(22), lineHeight: ui.fs(29), fontWeight: '700', marginBottom: 12 }}>{text(s)}</Text>
                <ActionButton secondary icon="copy" label={copied === s.id ? 'Copied' : 'Copy script'}
                  onPress={async () => { setCopyError(''); try { await Clipboard.setStringAsync(text(s)); setCopied(s.id); setTimeout(() => setCopied(''), 1400); } catch { setCopyError(s.id); } }} />
                {copyError === s.id ? <Text accessibilityRole="alert" style={{ color: c.destructive, marginBottom: 12 }}>Could not copy. Select the script text to copy it manually.</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Grid>
    </View>
  );
}
