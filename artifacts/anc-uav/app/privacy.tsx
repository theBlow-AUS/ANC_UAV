import { Text } from 'react-native';
import { Badge, Callout, Panel, Screen, SectionHeading } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';

export default function PrivacyScreen() {
  const colors = useColors();
  const paragraphs = [
    {
      title: 'No app server in this iteration',
      body: 'The app does not send location, incident notes, imported files, or credentials to a Replit service or an ANC UAV backend. No analytics or advertising SDK is configured.',
    },
    {
      title: 'Location',
      body: 'Location permission is requested only after you tap “Use current location”. The returned coordinate is used locally for measurement and is not written to the account vault or sent to a server.',
    },
    {
      title: 'Credentials',
      body: 'Saved entries use iOS Keychain or Android Keystore with device authentication. The app stores only provider labels in ordinary app preferences. The password is not placed in AsyncStorage and no provider connection is active.',
    },
    {
      title: 'Imported files and notes',
      body: 'Imported documents and content packs stay in app storage. Text and operator-entered incident assignment notes are held in local app preferences. Use the Library removal control for imported files and the Secure Accounts screen to delete a saved credential.',
    },
    {
      title: 'Provider accounts and permissions',
      body: 'Provider terms were checked on 9 November 2026. AIP storage/business use and NAIPS automation require written permission; weather-camera reuse permission has not been established. Direct downloads and all new credential capture remain blocked. CASA/myID and AVCRM are not connected. Official-site links open outside the app; the app cannot read their sign-in sessions.',
    },
    {
      title: 'Reference snapshots',
      body: 'On the native device you may import a local manifest and reference file you have rights to store. Metadata, declared source/effective dates and files stay in app-local storage, not the vault or a server. Replacements retain earlier versions; remove each version explicitly on Reference Snapshots. Dates, rights and sources are user-supplied and unverified. Images are always historical, never current weather. Ordinary files may be included in operating-system backups; device-only Keychain protections do not apply to reference files.',
    },
  ];

  return (
    <Screen
      eyebrow="Local data disclosure"
      title="Privacy & App Store"
      subtitle="Current first-iteration data handling"
      back
    >
      <Callout title="Not an App Store compliance certification">
        This describes the current prototype only. A public release still needs current Apple policy review, accurate App Privacy disclosures, security testing on supported devices, accessibility review, and approval of all bundled data.
      </Callout>
      <Panel>
        <Badge tone="good">NO RUNTIME REPLIT SERVICE CALLS</Badge>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          Core screens are designed to work offline. The app does not request a user account for these features.
        </Text>
      </Panel>
      {paragraphs.map((item) => (
        <Panel key={item.title}>
          <SectionHeading title={item.title} />
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>{item.body}</Text>
        </Panel>
      ))}
      <Panel>
        <SectionHeading title="Release checklist still required" />
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.mutedForeground }}>
          Test protected storage on a real iPhone and iPad; confirm portrait and landscape; review permission prompts, accessibility, privacy labels and required support links; confirm content rights; then validate the final build against the App Store Review Guidelines in force at submission.
        </Text>
      </Panel>
    </Screen>
  );
}
