# Privacy Policy

**Aviate.Navigate.Communicate (ANC UAV)**

**Effective:** 10 November 2026

**Last updated:** 10 November 2026

> **Publication status:** This draft is based on the current first-iteration app source and its documented service connections. It is not legal advice, a security certification, or confirmation that an app-store submission complies with every current requirement. The publisher's legal name and final release-build disclosures must be confirmed before publication. See the publisher note at the end.

## 1. Who is responsible

ANC UAV is an iOS-first mobile reference app for RPAS/UAV operators. The person or legal entity that publishes the app under the name shown on the applicable Apple App Store or Google Play listing is responsible for this policy.

**Publisher legal name:** [Confirm the exact individual or registered entity before publication.]

For privacy questions, access or correction requests, and complaints, contact:

**Email:** [support@ignisse.app](mailto:support@ignisse.app)

**Product:** Aviate.Navigate.Communicate (ANC UAV)

The app does not require an ANC UAV account. It has no ANC UAV cloud account, profile-sync or app-backend service in this iteration. Android is a later target; this notice must be checked against any Android release before it is offered.

## 2. Information the app handles

The app uses information when you choose a feature that needs it. Most of it stays on your device:

- **Location and coordinates:** A one-time device location used for a requested measurement or nearby reference search. Coordinates you type or select on the map are used locally. The optional weather feature is described in section 3.
- **Operating profiles:** Operator or ReOC labels, profile and version names, VLOS/EVLOS/BVLOS or custom operation labels, manual/effective-date notes, configured separation figures, and aircraft names/distances. These are stored in ordinary local app preferences, not the secure credential store. They may be included in operating-system backups.
- **Operational contacts and incident notes:** Contact names/numbers you enter, and incident/sector frequency notes you choose to record, are saved locally. They can contain personal or operationally sensitive information.
- **Imported content:** Documents, navigation or agency packs, and authorised reference snapshots you choose to import are stored on the device. The app does not upload their contents to an ANC UAV server.
- **Map and aviation reference data:** Map tiles, public airport/airspace reference downloads, and their local caches are stored on the device as described below.
- **Tool inputs:** Pasted NOTAMs and MET briefings and coordinate-calculator inputs are processed in the app. NOTAM and MET text is temporary app memory; it is not saved or sent to an AI service. It can remain on screen while you use the tool, including when its accordion is collapsed.
- **Optional OpenAIP client key:** If you choose to save your own key, it is stored using native device-protected storage and used only for a detail request you explicitly start. See section 4.
- **Support emails:** If you email support, the support mailbox receives the address and message you send. Your email provider and the support-mail provider process that communication under their own terms.

The app does not configure an analytics or advertising SDK, cross-app tracking, a user account, or automatic telemetry in this iteration. This describes the app source reviewed for this draft; the final store binary and its complete third-party SDK inventory still need to be checked.

## 3. Location: when it is used and where it goes

The app requests location permission only when you choose a GPS feature. It requests foreground/“while using the app” access; it does not request background location or continuously track movements.

| Feature | What happens |
| --- | --- |
| **Navigate, Map, or Tools GPS action** | The app obtains a one-time position to fill or measure a point and to search locally installed references. The position, accuracy and capture time are used in app memory. These GPS coordinates are not sent to ANC UAV or to an aviation-data provider. Map tap and manual-coordinate entry are alternatives where offered. |
| **Local UAV weather** | You must accept the on-screen non-commercial-use and location-sharing notice and then explicitly request weather using GPS. The app rounds latitude and longitude to three decimal places (roughly 111 metres of latitude; longitude distance varies by latitude) before sending them directly to `api.open-meteo.com`. The weather provider also receives normal network information such as your IP address. GPS accuracy and the unrounded fix are not sent. The rounded requested point and the last successful forecast are saved locally for offline reference until you clear them or replace them with a later successful request. No launch, scheduled, or background weather request is made. |
| **Online map display or offline tile download** | The selected map host receives requests for the tiles in the map view or download area, and normal connection information such as your IP address. A tile's coordinates reveal the approximate map area requested. The app does not send a raw GPS fix, typed route, map A/B measurement points, profile, incident note, or search term as part of the tile request. |
| **OpenAIP location lookup** | Polygon and nearby-airport calculations use the chosen point and downloaded data locally. They do not send the point to OpenAIP. An explicit export-version check or public-data download does not require location permission and does not send your location. |

Although the weather coordinate is rounded, three decimal places still describe a location at fine resolution. Do not treat the weather feature as anonymous or as a coarse-location-only service.

You can deny or later revoke location permission in device settings. Manual coordinate entry and tap-to-measure can remain available where supported. The weather feature will not make a GPS request unless you accept its separate notice and press its GPS action. Its current free endpoint is for **non-commercial use only**; do not use that weather endpoint for commercial operations.

## 4. Network connections and third parties

Network requests are made directly from your device to the relevant provider when you use the feature. They are not relayed through an ANC UAV backend or a Replit runtime service. Providers may receive IP addresses, request timing and other ordinary connection data. Their own privacy terms, logging practices and retention rules apply to their requests; ANC UAV does not control those records or promise how long a provider keeps them.

| Provider | When the app connects and what the request reveals | Provider information |
| --- | --- | --- |
| **Open-Meteo** | Only when you explicitly request GPS weather: the rounded location and standard connection data. No weather is fetched automatically. | [Terms & Privacy](https://open-meteo.com/en/terms) · [Licence](https://open-meteo.com/en/licence). The current free weather endpoint is non-commercial. |
| **OpenFreeMap / OpenMapTiles** | When the OpenStreetMap-style layer is viewed or downloaded: requested map tiles and standard connection data. The layer uses OpenFreeMap-hosted tiles with OpenMapTiles/OpenStreetMap attribution. | [OpenFreeMap privacy policy](https://openfreemap.org/privacy/) · [Terms of Service](https://openfreemap.org/tos/). |
| **Geoscience Australia** | When you view or download the topographic layer: requested map tiles and standard connection data. | [Geoscience Australia privacy policy](https://www.ga.gov.au/privacy). |
| **NASA EOSDIS GIBS** | When you view or download the dated satellite-browse layer: requested tiles and standard connection data. Imagery can be dated, coarse or cloud-obscured; it is not an aviation chart. | [GIBS API documentation](https://nasa-gibs.github.io/gibs-api-docs/) · [NASA Earthdata GIBS overview](https://earthdata.nasa.gov/gibs). |
| **GitHub** | Only after you explicitly request a community airport-data update: a version/check request to `api.github.com` and public CSV downloads from `raw.githubusercontent.com`. No GPS, search, incident notes or credentials are included. | [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). |
| **OpenAIP public export host** | Only after you explicitly check versions or download Australian data: a public file listing and airport/airspace export files from `storage.openaip.net`. These requests use no key and do not include GPS or searches. | [OpenAIP legal and data-use terms](https://www.openaip.net/legal) · [API documentation](https://docs.openaip.net/). |
| **OpenAIP Core API** | Only when you explicitly fetch or refresh details for a selected record: your OpenAIP client key and that record's source ID are sent in an HTTPS request to `api.core.openaip.net`. No GPS, route, incident note or search term is sent. OpenAIP may associate the request with your own OpenAIP account/key. | [OpenAIP legal and data-use terms](https://www.openaip.net/legal) · [API documentation](https://docs.openaip.net/). |
| **Email providers** | If you choose to contact support, they process your email and its contents. | The email systems you and the support mailbox use. |

Opening an external source or licence link uses your device's browser. ANC UAV does not read or control the browser session. Public reference and map requests may be processed on infrastructure outside Australia; the service provider determines its infrastructure and retention, which can change.

## 5. Local storage, security and backups

Profiles, notes, preferences, weather snapshots, imported material, downloaded reference data and map packs use ordinary app-local storage. These items are not all encrypted by ANC UAV. Their protection depends on the device, operating system, device security settings and backup configuration. Ordinary local files and preferences may be included in operating-system backups. Backup and uninstall behaviour must not be assumed to securely erase every copy.

An optional personal OpenAIP key is different: on a supported native build with device authentication enrolled, it is held in operating-system secure storage (iOS Keychain / Android Keystore-backed SecureStore). The key is not stored in a profile, downloaded file, ordinary preferences, URL, app bundle or ANC UAV server. The key is briefly available in app memory for an explicit HTTPS request to OpenAIP. Device-protected storage is not a guarantee against a compromised device, operating system or provider. Keychain entries may remain on the device after app removal or be affected by biometric-enrolment changes.

General Airservices/NAIPS Provider Access is disabled. Existing Airservices/NAIPS entries saved by an earlier version are not read, used or deleted by the current app. They are separate from the optional OpenAIP key. CASA/myID and AVCRM are not connected.

Profile backups exported from Settings are **unencrypted JSON**. They can contain ReOC/operator names, profile/version labels, manual notes, limits and aircraft distances. They exclude the active selection, vault credentials, display/contact preferences and incident data. If you use the system share sheet to save or send a backup, the destination app or recipient can receive and keep it. Protect the file accordingly.

No security measure can prevent someone with access to an unlocked or compromised device from viewing local app data. Use a device passcode, protect backups and exported files, and do not put passwords or API secrets in profile fields, notes, support emails or imported manifests.

## 6. Sharing and use of aviation information

You choose whether to call an operational contact, open an external link, import a file, export a profile, or share public OpenAIP reference data. Those actions may give information or a file to the operating system, your selected app, the network provider or the recipient. Review the selected destination before confirming.

ANC UAV does not provide an in-app emergency-call service and cannot call 000. Saved operational contacts are user-entered contacts only. Emergency calls, if required, must be placed using the device's native emergency-calling feature.

Location, downloaded data and calculated results are not an operational approval. The app does not determine flight clearance, validate a ReOC or manual, certify aircraft limits, verify that a frequency is current or infer an incident FCTAF from GPS. Public/community airspace and frequency data is secondary, incomplete or unverified. A map with no displayed results does not mean airspace is clear. Check current official documents and approved procedures.

## 7. Retention and deletion controls

The app has no ANC UAV user account or cloud copy to delete. Local data remains until you use an app control, remove the app or change device storage. These actions do not necessarily erase copies from operating-system backups, exported files, a Files/iCloud provider, recipients, temporary system storage or a third-party service.

You can manage local information in the app:

- **Profiles and versions:** Edit or delete in Settings. Deleting the active version clears the selection; it does not silently activate another.
- **Operational contacts:** Remove in Settings.
- **Weather:** Use **Clear saved weather** to remove the saved forecast and consent.
- **Downloaded OpenAIP data:** Use **Remove downloaded data** in Map. This removes its downloaded snapshot and cached API details, but not the optional key, bundled reference, map tiles, other providers' data or imports.
- **OpenAIP key:** Remove it separately in the key section. Removing the key leaves saved public data and cached details.
- **Offline map tiles:** Delete the individual saved map in Map.
- **Imported files and reference snapshots:** Use their removal controls in Library/Reference snapshots.
- **NOTAM and MET tool text:** Use **Clear text** in the tool.

There is no published fixed deletion period for third-party request logs or support-mail records. Ask the relevant provider about its records. If you email us, you can also request access to or correction/deletion of personal information held in the support mailbox. Requests are handled under applicable law; deletion may be limited where records must be kept or remain in backups.

## 8. Children

ANC UAV is designed for professional RPAS/UAV reference and is not directed to children. Do not use it to submit a child's personal information. If you believe a child has sent personal information to the support address, contact us at the address below and request its removal.

## 9. Privacy requests, complaints and changes

For a privacy question, access/correction request or complaint, email **[support@ignisse.app](mailto:support@ignisse.app)**. Explain what request you are making and which app feature it concerns. Please do not include an API key, password, precise location, raw NOTAM/MET briefing, incident report or other sensitive operational content unless it is necessary and you have removed unrelated details.

If you are in Australia and cannot resolve a privacy complaint with us, you may contact the [Office of the Australian Information Commissioner (OAIC)](https://www.oaic.gov.au/privacy/privacy-complaints) to ask whether it can assist. Your rights depend on the privacy laws that apply to you and the publisher.

We may update this policy if app features, service providers or applicable requirements change. The date at the top identifies the current revision. Material changes should be reflected in the published copy and store disclosures before the changed features are released.

## 10. App-store disclosure

This policy supplements, but does not replace, Apple's App Privacy details or Google Play's Data safety disclosures. Those forms must describe the final app binary, its SDKs and the third-party providers' actual data handling. In particular, do not describe the weather coordinate as merely coarse or claim that no location leaves the device: the app sends a three-decimal location directly to Open-Meteo after the user's separate consent and explicit action. Re-check the applicable definitions and declarations at submission:

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [OAIC mobile privacy guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/more-guidance/mobile-privacy-a-better-practice-guide-for-mobile-app-developers)

---

**Publisher check before public release:** Replace or confirm the publisher identity above with the exact person or legal entity responsible for the app and make it consistent with the Apple and Google store accounts. Confirm its privacy contact, applicable jurisdictions, final SDK/network inventory, provider terms, policy URL and store privacy declarations against the release build. This draft has not been approved by Apple, Google or a lawyer.
