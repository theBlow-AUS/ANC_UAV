# Aviate.Navigate.Communicate (ANC UAV)

## First-iteration privacy and release notes

This document describes the current iOS-first prototype. It is not a certification of App Store compliance. Apple requirements and review guidelines change; re-check the current rules before submission.

### Product direction

ANC UAV is an offline-first RPAS field-reference app. The initial content pack is NSW RFS-focused. The app architecture allows later operator-specific and agency-neutral content packs, with each pack retaining its issuer, jurisdiction, version, source references, and rights statement.

The initial target is iPhone and iPad, in portrait and landscape. Android is a later target.

### Data handled by the first iteration

| Data | Purpose | Storage / transmission |
| --- | --- | --- |
| Current location | Calculate a position measurement after the user taps the location action | Requested only while using the app; used locally and not sent to a server |
| Pasted NOTAM text | User-requested, limited plain-language reading aid in Tools | Temporary device memory; retained when its accordion is closed, not saved, uploaded, or sent to an AI/model or provider |
| Pasted MET briefing / TAF | Local, limited decoding in Tools | Temporary app memory only; retained when collapsed, never uploaded or persisted, including any names in the supplied text |
| Requested weather location and forecast | Opt-in non-commercial UAV weather reference on Aviate | Rounded 0.001° coordinates sent directly to Open-Meteo; last successful response, rounded point and consent in ordinary local preferences; provider sees IP and requested location; no Replit relay |
| Coordinates, incident frequency notes, selected content pack | Local measurements and operator-entered references | App-local device storage; not sent to a server |
| Saved operational phone contacts | User-entered contact names and numbers for operational use | App-local preferences; calling is optional and initiated by the user; ANC UAV has no emergency-call feature and blocks 000 |
| ReOC/operator labels, operating profile versions, reference limits and aircraft distances | Operator-configured offline reference sets | Ordinary app-local preferences, not the credential vault; not uploaded; may be included in operating-system backups |
| Imported PDF, Markdown, text, or JSON pack | Offline reference material | Copied to app-local device storage; not uploaded |
| Existing NAIPS or Airservices account entry | Provider Access is off; existing secure-store values are retained and are not accessed or deleted | Any pre-existing value remains in iOS Keychain or Android Keystore; no provider sign-in or download is available |
| Authorized local reference snapshots | Offline AIP PDF, NAIPS PDF/text, or historical camera image | Manifest provenance, declared issue/capture and effective dates, rights/use assertions and files in native app-local storage; not uploaded; assertions unverified |
| CASA / myID credentials | Not collected | No input or sign-in flow is provided |
| Community airport/frequency snapshot | Unverified nearby airport radio reference | Bundled locally; explicit update downloads public CSV data directly from GitHub, without location, searches or credentials |
| Optional Australian OpenAIP exports | Offline aerodrome/airspace overlays and source-linked reference | Explicit native actions request a public listing and two JSON exports from storage.openaip.net without a key or location; current and previous validated snapshots in ordinary local files, potentially included in OS backups |
| Optional personal OpenAIP client key | User-requested detail refresh of a selected airport/airspace | Native device-protected SecureStore with authentication and device-only accessibility; never in bundles, ordinary preferences, URLs, public files or logs; explicit request sends it in an HTTPS header to api.core.openaip.net |
| OpenAIP detail cache | Separately dated offline API details | Up to 25 active normalized public source details plus a recovery generation in a separate bounded local file store; no credential field; removing a key does not remove these records |

The app does not configure an ANC UAV backend, telemetry, advertising SDK or analytics SDK. It does not call Replit services from the app’s product runtime. Permission-gated Airservices/NAIPS/CASA connections and credential capture remain disabled: see `PROVIDER_PERMISSION_REVIEW.md`. OpenAIP is a narrow exception using its published public exports and documented personal-key API, not a restoration of general Provider Access. The project/developer API secret is not embedded, bundled or used as a shared runtime credential. The Replit development preview workflow is separate tooling and is not part of the app’s runtime data path.

ANC UAV does not provide an emergency-call feature. It does not show a built-in 000 call button and blocks saving or dialing 000 from the optional operational-contacts list. For emergencies, use the device’s native emergency-calling feature. Operational phone contacts are user-entered and are not an emergency service or assurance of emergency response.

Official provider-site links open the system browser only on an explicit user action and disclose the destination to that provider under its policies. The app cannot read the browser session and does not intercept sign-in. No credentials or provider downloads pass through Replit. No source URL in an imported manifest is fetched.

The separate public-domain OurAirports reference has a user-triggered update action. It obtains a GitHub commit ID and downloads two CSVs from that commit directly to the device, with no request on launch, account/API key or Replit callback. The remote hosts see ordinary network connection details (including IP address), not coordinates, searches, incident notes or vault data. Failed updates retain the last working snapshot. This does not enable permission-gated Airservices/NAIPS/camera adapters. See `content-packs/COMMUNITY_AVIATION.md`.

### User controls

- Location permission is requested only after the user asks to use current location.
- Weather separately requires non-commercial-use / location-sharing consent and an explicit GPS-weather action. Clear saved weather deletes the forecast snapshot and consent. There is no launch or background weather request; live retrieval needs internet, while the last saved forecast remains readable with timestamps.
- A user can remove imported documents from the local library.
- A user can create, edit, select and delete local operating profiles and versions in Settings. Profile values and ReOC/manual labels are unverified operator declarations, not authorisations. Deleting the active version clears selection without selecting a replacement. See `OPERATING_PROFILES.md`.
- Provider Access is disabled. The app does not read or delete pre-existing credential-vault values and makes no provider requests from that route.
- Map's OpenAIP accordion offers explicit version checks/downloads, cancellation before committing, overlay visibility, reference search, removal, and iOS sharing of normalized public reference data with licence/attribution. Sharing uses the native chooser and includes no key or operator-entered data. Removing downloaded data deletes this source's snapshot generations and API detail cache, not its key, bundled data, user imports or other-provider entries.
- OpenAIP key save/replace makes no network request. Explicit detail refresh unlocks it and requests a fixed, documented airport/airspace ID endpoint. The provider sees that source ID, the client key and normal connection metadata, not GPS, search terms or incident notes. Key removal leaves reference data and cached details. A non-secret status marker is not proof a Keychain entry is absent after reinstall; removal is available even after biometric enrolment changes.
- A user can import a manifest plus authorized local reference file, view its declared source/effective timestamps, import a replacement while retaining prior versions, and delete individual versions. No automatic internet refresh occurs. The web preview cannot store reference snapshots or vault credentials.
- No cloud recovery or developer-accessible credential copy exists in the product design.

Before any release, verify Keychain and Keystore behavior on real supported devices, including reinstall and backup/restore cases. Do not promise that ordinary imported files or local preferences are excluded from operating-system backups unless that behavior has been explicitly configured and tested.

Protected OpenAIP keys require a native build with enrolled device authentication; browser and Expo Go do not weaken those protections or accept keys. Public downloads work without a key in the native app, including its schematic-map fallback. The export bucket did not return browser CORS permission when checked on 10 November 2026; browser preview therefore explains native-only downloads instead of using a proxy. Check/download/detail are explicit actions only: no launch, periodic or background network requests.

Device-at-rest protection is not a guarantee against a compromised device, its OS or the API provider. JavaScript necessarily holds the key briefly to submit an explicitly requested HTTPS request. There is no developer credential backend or shared owner key. Keychain entries may survive reinstall or become inaccessible after enrolment changes. Validate these behaviours on the final native binary, not only unit mocks.

Snapshot files are ordinary app files, not protected vault credentials. They may be included in OS backups. Do not import licensed/sensitive material whose terms prohibit that behavior until tested backup exclusion and required file protection are in place. Structural parser tests do not establish aviation accuracy or a secure full PDF/image parser. See `content-packs/REFERENCE_SNAPSHOTS.md` for limits and the manifest contract.

### Aviation data and operational limitations

- The Quick Reference supporting screen transcribes a user-supplied mockup and is visibly marked unverified; it is not a dedicated tab.
- The supplied January 2025 SOP PDF is not bundled. Its filename/internal revision difference must be resolved against a controlled copy.
- The NSW 132.55 MHz FCTAF value is a scope-limited reference and requires current operational confirmation. Incident assignments are operator-entered and never inferred by GPS.
- A public-domain Natural Earth Australia overview and selected localities are bundled for offline reference, not as aviation charts. A separate public-domain OurAirports snapshot includes Australian aerodromes and airport-associated radio records, including community-reported CTAFs. A partial OpenAIP area-frequency reference is bundled; optional public AU airport/airspace downloads supersede that OpenAIP generation in lookup while retaining first-class geometry even without frequencies. All remain uncertified, partial and of unknown source-effective dates; proximity does not establish applicability. No official AIP, NOTAM, NAIPS briefing or weather-camera dataset is bundled. See `content-packs/NAVIGATION_PACKS.md`, `content-packs/COMMUNITY_AVIATION.md` and `content-packs/OPENAIP_DOWNLOADS.md`.
- Coordinate measurements are mathematical results from the coordinates shown; they do not establish airspace applicability, radio-service selection, or flight clearance.
- The Tools NOTAM explainer processes pasted text locally using a limited deterministic parser and glossary. It does not fetch or verify notices. Unsupported codes, schedules, and uncertain meanings are shown unchanged or flagged. This reading aid is not a current NOTAM briefing, operational advice, clearance, or replacement for the official notice.
- The Tools MET reader handles a limited Australian TAF subset and preserves supplied briefing narratives and regional probabilities separately. It is not an official weather briefing; unsupported codes remain visible. TAF surface winds are never treated as a 120 m profile at the user's GPS location.
- Open-Meteo weather is model output, not an on-site observation or aviation-approved briefing. Its free API is restricted to non-commercial use. Current provider terms were accepted for this integration; future commercial-operator distribution must not reuse the free endpoint without appropriate authorization. No 80/120 m gust or local turbulence profile is inferred. See `WEATHER_AND_MET.md`.
- Imported rules and checklists remain unverified and read-only. A pack cannot promote itself to trusted status.
- Local reference snapshots also remain unverified. Effective dates and source/capture times are operator-supplied declarations; an import timestamp is never substituted for them. Missing dates mean unknown currency; expired dates mean stale; future dates and references not yet effective are explicit. Even within declared dates, currentness is not independently verified.
- Weather-camera snapshots are labelled **HISTORICAL IMAGE — NOT CURRENT WEATHER** at all times, including immediately after import. They are not live weather observations. Missing local coverage is not a safe/clear result.

### Pre-submission release gates

1. Verify redistribution rights for every included manual, quick reference, dataset, map layer, logo and frequency source, retaining applicable licences/public-domain releases and obtaining written permission where required. Independently review operational content; a data licence is not aviation approval.
2. Review the App Store Review Guidelines and complete the App Privacy questionnaire using the final app binary and actual third-party SDK inventory.
3. Add the required public privacy policy and support URL, age/content ratings, accessibility information, and truthful product-page descriptions.
4. Test iPhone and iPad layouts, portrait and landscape rotation, offline launch, storage exhaustion, interrupted imports, permission denial, Keychain/Keystore authentication, deletion, and backup/restore behavior.
5. Conduct security, accessibility, aviation-content, operational-risk, and legal reviews. Do not market this prototype as approved for operational decision-making.
6. Keep permission-gated provider downloads disabled until their terms, account authorization, agency rights, redistribution permissions and authentication design have been reviewed for each operator and jurisdiction. OpenAIP's published export/API conditions are specific to that source, not approval for other providers.
