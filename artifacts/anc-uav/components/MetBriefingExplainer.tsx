import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, SectionHeading, TextField } from './FieldKit';
import { useColors } from '../hooks/useColors';
import { explainMetBriefing, type MetReading } from '../lib/met-briefing';

export function MetBriefingExplainer() {
  const c = useColors();
  const [draft, setDraft] = useState('');
  const [reading, setReading] = useState<MetReading | null>(null);
  const [error, setError] = useState('');
  function change(text: string) { setDraft(text); setReading(null); setError(''); }
  return <View>
    <SectionHeading title="MET briefing · plain English" detail="Local reader for a TAF or the supplied Australian briefing format" />
    <Callout title="Reading aid, not a weather briefing">
      No upload, AI service, or provider lookup. It cannot confirm the latest forecast or whether conditions are suitable for flight. Unsupported codes stay visible; source times stay in UTC.
    </Callout>
    <TextField label="MET briefing text" value={draft} onChangeText={change} multiline maxLength={30000}
      autoCorrect={false} autoCapitalize="characters" textAlignVertical="top"
      style={{ minHeight: 160, paddingTop: 12, fontSize: 15, fontWeight: '500', lineHeight: 21 }}
      placeholder="Paste the briefing and TAF here" testID="met-input"
      hint="Temporary app memory only; not saved. Clear text removes the draft and reading." />
    <ActionButton label="Explain on device" icon="book-open" disabled={!draft.trim()} testID="met-explain" onPress={() => {
      try { setReading(explainMetBriefing(draft)); setError(''); }
      catch (e) { setReading(null); setError(e instanceof Error ? e.message : 'Could not read this briefing.'); }
    }} />
    <ActionButton label="Clear text" secondary icon="x" disabled={!draft} testID="met-clear" onPress={() => change('')} />
    {error ? <Callout title="Not interpreted" tone="danger">{error}</Callout> : null}
    {reading ? <View testID="met-result" accessibilityLiveRegion="polite">
      <Panel><Badge tone="warning">LIMITED LOCAL READING</Badge>
        {reading.warnings.map(w => <Text key={w} style={{ color: c.mutedForeground, fontSize: 13, lineHeight: 19 }}>{w}</Text>)}
      </Panel>
      {reading.blocks.map((block, i) => <Panel key={`${i}-${block.title}`}>
        <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 17 }}>{block.title}</Text>
        {block.lines.map((line, j) => <Text key={j} selectable style={{ color: c.foreground, fontSize: 14, lineHeight: 21 }}>{line}</Text>)}
        {block.unknown.length ? <Text style={{ color: c.mutedForeground, fontSize: 13 }}>Not interpreted: {block.unknown.join(' · ')}</Text> : null}
        <Text selectable style={{ color: c.mutedForeground, fontSize: 13, lineHeight: 19 }}>Source: {block.source || '(empty)'}</Text>
      </Panel>)}
      <Panel><SectionHeading title="Original briefing" /><Text selectable style={{ color: c.foreground, fontSize: 13, lineHeight: 19 }}>{reading.original}</Text></Panel>
      <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 12 }}>TAF conventions based on Bureau of Meteorology education guidance (CC BY 4.0). Limited subset; no endorsement.</Text>
      <ActionButton secondary label="TAF decoding reference" icon="external-link" onPress={() => {
        void Linking.openURL('https://reg.bom.gov.au/aviation/data/education/taf.pdf').catch(() => setError('Could not open the reference in your browser.'));
      }} />
    </View> : null}
  </View>;
}
