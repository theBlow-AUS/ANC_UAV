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
      body: 'Location permission is requested only after you ask to use device GPS. Measurements and nearby frequency discovery use coordinates locally. The separate, opt-in weather action sends coordinates rounded to 0.001° directly to Open-Meteo; GPS accuracy and the unrounded fix are not sent. Coordinates are not written to the account vault.',
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
      title: 'Optional OpenAIP reference downloads',
      body: 'On native devices, explicit Check versions or Download AU data actions request a public Australian export listing and airport/airspace JSON files directly from storage.openaip.net. No account or key is needed. The host receives normal connection details such as IP address, not your GPS, entered coordinates, searches or incident notes. There are no launch/background checks or Replit relays. Validated snapshots and a previous backup are ordinary local files and may enter OS backups; Remove downloaded data deletes these and the separate API detail cache, not imported packs or the personal key. Source-effective dates and completeness remain unknown.',
    },
    {
      title: 'Optional personal OpenAIP key',
      body: 'A separate OpenAIP-only key can be entered in a native build with enrolled device authentication. It uses protected device storage (iOS Keychain / Android Keystore-backed SecureStore), is masked and not included in downloaded packs, app bundles or ordinary preferences. Saving it makes no request. Explicit Fetch/Refresh API detail unlocks it and sends it in an HTTPS header only to api.core.openaip.net, with the selected source record ID; no GPS or search terms are sent. Up to 25 details are cached separately as ordinary local files, not credentials. Removing the key leaves cached public data/details; removing downloaded data leaves the key. No developer-accessible credential backend exists, but at-rest protection is not a guarantee against a compromised device, its OS or the API provider. Keychain entries can survive reinstall. Browser/Expo Go do not offer a weaker credential-storage fallback.',
    },
    {
      title: 'Credentials',
      body: 'General Provider Access and its credential tools are turned off. Any old Airservices/NAIPS entries saved in iOS Keychain or Android Keystore remain there; this app does not access or delete them. Optional OpenAIP-only keys are separate and do not enable those providers.',
    },
    {
      title: 'Imported files and notes',
      body: 'Imported documents and content packs stay in app storage. Text and operator-entered incident assignment notes are held in local app preferences. Use the Library removal control for imported files.',
    },
    {
      title: 'Local UAV weather',
      body: 'Open-Meteo forecast requests go directly from the device to api.open-meteo.com only after non-commercial-use and coordinate-sharing consent and a GPS-weather action. The provider sees the rounded location and normal network details such as IP address. A last successful forecast, rounded requested point and consent are saved in ordinary device preferences for offline reference and may enter OS backups. No automatic launch/background refresh or Replit relay is used. Clear saved weather removes this snapshot and consent. The free endpoint is not enabled for commercial use.',
    },
    {
      title: 'Pasted MET briefings',
      body: 'The Tools reading aid processes supplied briefing text entirely in temporary app memory using a local TAF decoder. It does not upload or save briefings, including any names in them. Clear text removes the draft and reading. It does not retrieve a current briefing, verify currency or interpret every code.',
    },
    {
      title: 'Pasted NOTAM text',
      body: 'The Tools reading aid interprets text locally on the device. Text is held only in temporary app memory; use Clear text to remove the draft and explanation. It is not saved, uploaded, sent to an AI/model, or sent to a provider. The tool does not fetch or verify NOTAMs.',
    },
    {
      title: 'Operating profiles',
      body: 'ReOC/operator labels, saved profile versions, manual notes, reference limits and aircraft distances stay in ordinary local preferences, not the encrypted credential vault. Manage and delete them in Settings. They are not uploaded and do not verify a ReOC or authorise an operation. Do not enter passwords here. Operating-system backups may include these settings; there is no cloud sync or profile recovery service.',
    },
    {
      title: 'Provider accounts and permissions',
      body: 'General Provider Access is turned off. Airservices/NAIPS sign-in, credential access and provider downloads remain unavailable. Existing secure-vault entries are not accessed or deleted. OpenAIP public exports and optional personal API keys are a separate, narrowly scoped reference feature. CASA/myID and AVCRM are not connected.',
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
