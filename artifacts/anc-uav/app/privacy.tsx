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
      body: 'Location permission is requested only after you ask to use device GPS. The returned coordinate is used locally for measurements and nearby frequency discovery; it is not written to the account vault or sent to a server.',
    },
    {
      title: 'Offline map downloads',
      body: 'The native map can request tiles directly from OpenFreeMap, Geoscience Australia and NASA EOSDIS GIBS. These providers receive the tile coordinates for map areas you view or download, which can reveal the approximate area, plus normal connection details such as your IP address. The app does not send your entered route coordinates or raw GPS fix to these map hosts. Offline packs are stored by MapLibre on the device. No map request is routed through Replit.',
    },
    {
      title: 'Public community airport data',
      body: 'A public-domain OurAirports Australian aerodrome/frequency snapshot is bundled for offline reference. Only the explicit update action in Comms requests a commit ID from api.github.com and two public CSV files from raw.githubusercontent.com. No requests occur on launch. No coordinates, search terms, credentials or incident notes are sent; the hosts can see ordinary connection details such as your IP address. Failed updates retain the prior snapshot. Community records have unknown effective dates and do not establish airspace applicability.',
    },
    {
      title: 'Credentials',
      body: 'Provider Access and its credential tools are turned off. Any entries previously saved in iOS Keychain or Android Keystore remain there; this app does not access or delete them. No provider connection is active.',
    },
    {
      title: 'Imported files and notes',
      body: 'Imported documents and content packs stay in app storage. Text and operator-entered incident assignment notes are held in local app preferences. Use the Library removal control for imported files.',
    },
    {
      title: 'Pasted NOTAM text',
      body: 'The Comms reading aid interprets text locally on the device. The text is held only in temporary screen memory and is cleared when you leave Comms; it is not saved, uploaded, sent to an AI/model, or sent to a provider. The tool does not fetch or verify NOTAMs.',
    },
    {
      title: 'Operating profiles',
      body: 'ReOC/operator labels, saved profile versions, manual notes, reference limits and aircraft distances stay in ordinary local preferences, not the encrypted credential vault. Manage and delete them in Settings. They are not uploaded and do not verify a ReOC or authorise an operation. Do not enter passwords here. Operating-system backups may include these settings; there is no cloud sync or profile recovery service.',
    },
    {
      title: 'Provider accounts and permissions',
      body: 'Provider Access is turned off. No provider sign-in, credential access, or provider downloads are available in this app. Any old secure-vault entries remain on the device and are not accessed or deleted. CASA/myID and AVCRM are not connected.',
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
