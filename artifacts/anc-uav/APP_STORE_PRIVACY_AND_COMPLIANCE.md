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
| Coordinates, incident frequency notes, selected content pack | Local measurements and operator-entered references | App-local device storage; not sent to a server |
| Imported PDF, Markdown, text, or JSON pack | Offline reference material | Copied to app-local device storage; not uploaded |
| NAIPS or Airservices account entry | Optional future authorized use | Password/credential in iOS Keychain or Android Keystore with device authentication; provider name only in app preferences |
| CASA / myID credentials | Not collected | No input or sign-in flow is provided |

The first iteration does not configure an ANC UAV backend, telemetry, advertising SDK, analytics SDK, or provider download adapter. It does not call Replit services from the app’s product runtime. The Replit development preview workflow is separate tooling and is not part of the app’s runtime data path.

### User controls

- Location permission is requested only after the user asks to use current location.
- A user can remove imported documents from the local library.
- A user can test device authentication for a saved vault entry or delete that entry.
- No cloud recovery or developer-accessible credential copy exists in the product design.

Before any release, verify Keychain and Keystore behavior on real supported devices, including reinstall and backup/restore cases. Do not promise that ordinary imported files or local preferences are excluded from operating-system backups unless that behavior has been explicitly configured and tested.

### Aviation data and operational limitations

- The Quick Reference tab transcribes a user-supplied mockup and is visibly marked unverified.
- The supplied January 2025 SOP PDF is not bundled. Its filename/internal revision difference must be resolved against a controlled copy.
- The NSW 132.55 MHz FCTAF value is a scope-limited reference and requires current operational confirmation. Incident assignments are operator-entered and never inferred by GPS.
- Ordinary aerodrome CTAFs, geographic airspace CTAFs, AIP, NOTAM, NAIPS briefings, weather cameras, and a licensed offline basemap are not bundled or downloaded in this iteration.
- Coordinate measurements are mathematical results from the coordinates shown; they do not establish airspace applicability, radio-service selection, or flight clearance.
- Imported rules and checklists remain unverified and read-only. A pack cannot promote itself to trusted status.

### Pre-submission release gates

1. Obtain written approval for every manual, quick reference, dataset, map layer, logo, and frequency record included or redistributed.
2. Review the App Store Review Guidelines and complete the App Privacy questionnaire using the final app binary and actual third-party SDK inventory.
3. Add the required public privacy policy and support URL, age/content ratings, accessibility information, and truthful product-page descriptions.
4. Test iPhone and iPad layouts, portrait and landscape rotation, offline launch, storage exhaustion, interrupted imports, permission denial, Keychain/Keystore authentication, deletion, and backup/restore behavior.
5. Conduct security, accessibility, aviation-content, operational-risk, and legal reviews. Do not market this prototype as approved for operational decision-making.
6. Keep provider downloads disabled until the relevant provider terms, account authorization, agency rights, data redistribution permissions, and authentication design have been reviewed for each operator and jurisdiction.
