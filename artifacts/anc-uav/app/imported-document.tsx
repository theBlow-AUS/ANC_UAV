import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Callout, Panel, Screen } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';
import { useAppData } from '../context/AppDataContext';

export default function ImportedDocumentScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const { localDocuments } = useAppData();
  const colors = useColors();
  const document = localDocuments.find((item) => item.id === documentId);

  return (
    <Screen title={document?.title ?? 'Imported document'} subtitle="Local file · user supplied · unverified" back>
      <Callout title="Unverified content">
        Confirm the issuing body, revision, jurisdiction, effective date, and rights before relying on this text.
      </Callout>
      {document?.textContent ? (
        <Panel>
          <Text selectable style={{ fontSize: 14, lineHeight: 22, color: colors.foreground }}>
            {document.textContent}
          </Text>
        </Panel>
      ) : (
        <Panel>
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.mutedForeground }}>
            This local file is no longer available in app storage.
          </Text>
        </Panel>
      )}
    </Screen>
  );
}
