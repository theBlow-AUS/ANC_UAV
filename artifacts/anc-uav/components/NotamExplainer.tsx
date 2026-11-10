import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, SectionHeading, TextField } from './FieldKit';
import { useColors } from '../hooks/useColors';
import { explainNotam, type NotamExplanation } from '../lib/notam-explainer';

const MAX_NOTAM_LENGTH = 12_000;

export function NotamExplainer({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<NotamExplanation | null>(null);
  const [error, setError] = useState('');

  function explain() {
    try {
      setResult(explainNotam(draft));
      setError('');
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'This text could not be interpreted.');
    }
  }

  function updateDraft(value: string) {
    setDraft(value);
    setResult(null);
    setError('');
  }

  return (
    <View>
      {!embedded ? <SectionHeading title="NOTAM plain-English" detail="Paste supplied text · parsed on this device" /> : null}
      <Callout title="Reading aid only">
        This does not fetch NOTAMs or verify currency, completeness, applicability, or operational meaning. Check the current official NOTAM and approved publications. Never use this explanation as clearance or a flight-planning decision.
      </Callout>
      <TextField
        label="NOTAM text"
        hint="Text stays in temporary app memory and is not saved. Use Clear text to remove it. Maximum 12,000 characters."
        value={draft}
        onChangeText={updateDraft}
        placeholder={'Paste a NOTAM, including its Q), A), B), C) and E) sections'}
        multiline
        numberOfLines={7}
        maxLength={MAX_NOTAM_LENGTH}
        autoCapitalize="characters"
        textAlignVertical="top"
        style={{ minHeight: 150, paddingTop: 12, fontSize: 15, lineHeight: 21, fontWeight: '500' }}
        testID="notam-input"
      />
      <ActionButton
        label="Explain on device"
        icon="book-open"
        onPress={explain}
        disabled={!draft.trim()}
        testID="notam-explain"
      />
      <ActionButton label="Clear text" icon="x" secondary onPress={() => updateDraft('')}
        disabled={!draft} testID="notam-clear" />
      {error ? <Callout title="Could not explain this text" tone="danger">{error}</Callout> : null}
      {result ? (
        <View accessibilityLiveRegion="polite" testID="notam-result">
          <SectionHeading title="Local explanation" detail="Original wording is retained below." />
          {result.warnings.length ? (
            <Panel>
              <Badge tone="warning">{`${result.warnings.length} LIMITATION${result.warnings.length === 1 ? '' : 'S'} · REVIEW`}</Badge>
              {result.warnings.map((warning, index) => (
                <Text key={`${index}-${warning}`} style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>{warning}</Text>
              ))}
            </Panel>
          ) : null}
          {result.items.map((item, index) => (
            <Panel key={`${item.label}-${index}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
                <Badge tone={item.interpreted ? 'muted' : 'warning'}>{item.interpreted ? 'LIMITED PARSE' : 'AS WRITTEN'}</Badge>
              </View>
              <Text selectable style={{ color: colors.foreground, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{item.value}</Text>
              {item.explanation ? <Text selectable style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>{item.explanation}</Text> : null}
            </Panel>
          ))}
          {result.expansions.length ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
              Limited glossary used: {result.expansions.join(' · ')}
            </Text>
          ) : null}
          <Panel>
            <SectionHeading title="Original NOTAM" detail="Kept unchanged for comparison" />
            <Text selectable style={{ color: colors.foreground, fontFamily: 'monospace', fontSize: 13, lineHeight: 19 }}>{result.original}</Text>
          </Panel>
        </View>
      ) : null}
    </View>
  );
}
