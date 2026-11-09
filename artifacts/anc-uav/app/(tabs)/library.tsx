import { Feather } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading } from '../../components/FieldKit';
import { useColors } from '../../hooks/useColors';
import { useAppData } from '../../context/AppDataContext';
import { deleteImportedFile, pickAndImportContent } from '../../lib/imports';

export default function LibraryScreen() {
  const colors = useColors();
  const { packs, activePack, localDocuments, selectPack, addPack, addLocalDocument, removeLocalDocument } = useAppData();
  const [busy, setBusy] = useState(false);

  async function importContent() {
    if (busy) return;
    setBusy(true);
    try {
      const imported = await pickAndImportContent();
      if (!imported) return;
      if (imported.kind === 'pack') {
        await addPack(imported.pack);
        Alert.alert(
          'Pack imported',
          `${imported.pack.name} is stored locally and remains unverified. It cannot establish operational approval.`,
        );
      } else {
        await addLocalDocument(imported.document);
        Alert.alert('Document imported', 'The file is stored on this device and marked unverified.');
      }
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error ? error.message : 'The file could not be imported.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function previewDocument(uri: string) {
    try {
      await new File(uri).preview();
    } catch {
      Alert.alert('Preview unavailable', 'This device could not preview the selected file.');
    }
  }

  function confirmRemoveDocument(documentId: string, uri: string) {
    Alert.alert('Remove imported file?', 'This deletes the local copy and its library record from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteImportedFile(uri);
              await removeLocalDocument(documentId);
            } catch {
              Alert.alert('Remove failed', 'The local file could not be deleted.');
            }
          })();
        },
      },
    ]);
  }

  return (
    <Screen
      eyebrow="Local library"
      title="Content & Sources"
      subtitle="Files and packs stay on this device."
    >
      <Callout title="Imported content is never trusted automatically">
        Packs are treated as user-supplied and unverified, even when the file claims to be approved. This app does not merge jurisdictions, apply rules, or activate imported frequencies.
      </Callout>

      <SectionHeading title="Installed agency packs" detail="Choose a pack to set its local context." />
      {packs.map((pack) => {
        const selected = pack.id === activePack.id;
        return (
          <Pressable
            key={pack.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={`content-pack-${pack.id}`}
            onPress={() => void selectPack(pack.id)}
          >
            <Panel style={selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{pack.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {pack.issuer} · {pack.jurisdiction.country} · {pack.jurisdiction.region}
                  </Text>
                </View>
                <Badge tone={selected ? 'good' : 'warning'}>{selected ? 'ACTIVE' : pack.isBuiltIn ? 'REVIEW' : 'UNVERIFIED'}</Badge>
              </View>
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
                Version {pack.version} · {pack.documents.length} source document{pack.documents.length === 1 ? '' : 's'} · {pack.rules.length} reference entr{pack.rules.length === 1 ? 'y' : 'ies'} · {pack.checklists.length} checklist{pack.checklists.length === 1 ? '' : 's'}
              </Text>
            </Panel>
          </Pressable>
        );
      })}

      <SectionHeading title="Bundled NSW RFS source notes" />
      <Panel>
        <View style={{ gap: 6 }}>
          <Badge tone="warning">QRG MOCKUP — APPROVAL PENDING</Badge>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
            RPAS Operator Quick Reference
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            The supplied two-sided A5 mockup is transcribed in the Quick Reference tab. Personal contacts were omitted.
          </Text>
          <ActionButton label="Open Quick Reference" icon="book-open" secondary onPress={() => router.push('/quick-reference')} />
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }}>
          <Badge tone="warning">NOT BUNDLED</Badge>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
            RFS SOPs Uncrewed Aerial Vehicles
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            The supplied January 2025 PDF is not packaged in the app. Its filename and internal revision/footer differ; import a controlled copy after confirming its status and distribution rights.
          </Text>
        </View>
      </Panel>

      <SectionHeading title="Import to this device" detail="Supported: schema-v1 JSON packs, PDF, Markdown, and plain text." />
      <Panel>
        <ActionButton
          label={busy ? 'Importing…' : 'Choose a local file'}
          icon="folder-plus"
          onPress={importContent}
          disabled={busy}
          testID="import-local-content"
        />
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>
          No account, cloud drive, or Replit service is used. Text files are saved locally; PDFs are stored locally and opened with the device preview. PDF text is not extracted in this iteration.
        </Text>
      </Panel>

      <SectionHeading title="Imported documents" detail={`${localDocuments.length} stored on this device`} />
      {localDocuments.length ? (
        localDocuments.map((document) => (
          <Panel key={document.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name={document.mimeType === 'application/pdf' ? 'file-text' : 'file'} size={19} color={colors.primary} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{document.title}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{document.fileName}</Text>
              </View>
              <Badge tone="warning">UNVERIFIED</Badge>
            </View>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {document.issuer} · {document.jurisdiction} · stored locally
            </Text>
            <ActionButton
              label={document.mimeType === 'application/pdf' ? 'Open device preview' : 'Read text'}
              icon="external-link"
              secondary
              onPress={() => {
                if (document.mimeType === 'application/pdf') {
                  void previewDocument(document.localUri);
                } else {
                  router.push({ pathname: '/imported-document', params: { documentId: document.id } });
                }
              }}
            />
            <ActionButton
              label="Remove local file"
              icon="trash-2"
              secondary
              onPress={() => confirmRemoveDocument(document.id, document.localUri)}
            />
          </Panel>
        ))
      ) : (
        <Panel>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
            No local manuals or policy files imported.
          </Text>
        </Panel>
      )}

      {!activePack.isBuiltIn ? (
        <>
          <SectionHeading title="Active pack references" detail="Imported text — unverified and read-only." />
          {activePack.documents.map((document) => (
            <Panel key={document.id}>
              <Badge tone="warning">UNVERIFIED SOURCE</Badge>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{document.title}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{document.source} · {document.version}</Text>
              {document.sections.map((section, index) => (
                <View key={`${document.id}-${index}`} style={{ gap: 5 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{section.heading}</Text>
                  <Text selectable style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>{section.body}</Text>
                </View>
              ))}
            </Panel>
          ))}
          {activePack.rules.map((rule) => (
            <Panel key={rule.id}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{rule.title}</Text>
              <Text selectable style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>{rule.statement}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{rule.sourceReference} · unverified</Text>
            </Panel>
          ))}
        </>
      ) : null}

      <SectionHeading title="Pack format" detail="Data only; no scripts, plug-ins, or network endpoints." />
      <Panel>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.foreground }}>
          A pack includes its issuer, jurisdiction, version, source note, rights summary, attributed documents, plain-text references, and read-only checklists.
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>
          The JSON Schema and an example manifest are in the project’s content-packs folder. The app validates the fields and forces every import into an unverified state.
        </Text>
      </Panel>

      <SectionHeading title="Credentials" />
      <Panel>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          The local secure vault uses the device’s protected storage. Provider access and automatic downloads are separate and remain disabled pending permission review.
        </Text>
        <ActionButton label="Open secure vault" icon="lock" secondary onPress={() => router.push('/accounts')} />
      </Panel>

      <SectionHeading title="Privacy & App Store information" />
      <Panel>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Review what is stored on this device and what still needs testing before any public release.
        </Text>
        <ActionButton label="View privacy details" icon="shield" secondary onPress={() => router.push('/privacy')} />
      </Panel>
    </Screen>
  );
}
