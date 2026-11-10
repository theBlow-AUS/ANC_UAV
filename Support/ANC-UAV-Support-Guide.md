# Aviate.Navigate.Communicate (ANC UAV)

## Support and user guide

**For:** The current iOS-first RPAS/UAV reference app

**Last updated:** 10 November 2026

**Support:** [support@ignisse.app](mailto:support@ignisse.app)

**Privacy Policy:** [Privacy/Privacy-Policy.md](../Privacy/Privacy-Policy.md)

> ANC UAV is an offline-first reference tool, not an aviation authority, approved flight-planning system, or substitute for your current operations manual, official aeronautical information or agency procedures. Verify operational limits and frequencies before use.

## 1. First steps

1. Open **Settings → Display** and choose your display mode, text size, preferred default distance unit, and **Solo** or **Multi-Crew** priority order.
2. Open **Settings → Profiles → Manage** and make a profile for the operator/ReOC and manual that apply to your operation. Follow [Build profiles for your ReOC](#4-build-profiles-for-your-reoc) below.
3. In Settings, review **Content & privacy** and the available quick reference, checklists and local documents. The content pack currently included is RFS-focused; its procedures and draft figures are not verified by ANC UAV.
4. Use the tabs at the bottom of the screen:

| Tab | What it is for |
| --- | --- |
| **Aviate** | The selected profile's operator-entered limits and aircraft distances; the optional local UAV weather panel; and a traffic-call-script shortcut. |
| **Navigate** | Navigation reference material, map measurements and navigation tools. |
| **Comms** | Radio scripts, separate incident/statewide FCTAF references, airport frequencies and spatial lookup. |
| **Map** | Tap-to-measure reference map, optional GPS measurement, downloadable map layers and the OpenAIP reference overlay. |
| **Tools** | On-device NOTAM and MET reading aids, distance conversion, coordinate distance/bearing, and comparison tools. |
| **Settings** | Profiles, contacts, appearance, units, crew mode, content library and privacy information. |

Most sections expand or collapse. Closing a section does not necessarily clear its input; use that tool's **Clear text** control where provided.

## 2. Location and local weather

### One-time GPS measurement

When you choose a **Use GPS** action in Map, Navigate or Tools, ANC UAV asks for foreground location permission if needed and requests a one-time fix. It does not track you continuously or request background location. Map taps and manual coordinate entry are alternatives where the screen supports them.

Coordinates used for nearby lookups are evaluated against the datasets installed on the device. A nearby airport is a distance result, not proof that its frequency applies at your position. The GPS fix is not sent to ANC UAV.

### Local UAV weather

On **Aviate → Local UAV weather**:

1. Read and accept the non-commercial-use/location-sharing notice.
2. Press **Use GPS for weather** when you are ready to request a forecast.
3. Check the retrieval time, requested area, forecast age and limitations. The expanded forecast shows the supported 10 m, 80 m and 120 m fields when supplied.
4. Use **Clear saved weather** in **Weather source & storage** to remove the saved forecast and the consent setting.

The request rounds the location to three decimal places and sends that point directly to Open-Meteo. No weather is fetched on launch or in the background. The last successful forecast is cached locally for offline reference; an old forecast is not a live reading. Open-Meteo's free endpoint is **non-commercial only**. Do not use that endpoint for commercial operations.

The result is model output, not an on-site observation or approved aviation forecast. It does not certify weather suitability for flight, supply a complete wind-gust profile at 80/120 m, or replace official warnings, aviation weather, your aircraft limits or local observation.

## 3. Map, measurements and downloads

### Measure two points

1. Open **Map**.
2. Tap **Tap sets A**, then select the first point on the map. Tap **Tap sets B**, then select the second point.
3. Read the displayed distance in kilometres and nautical miles and the initial true bearing.
4. To use your current position for the origin, choose the map's GPS action and allow foreground location access. You can still enter coordinates manually.

The line between the points is a visual connector, not a flight route. The calculation does not include terrain, obstacles, airspace clearance or operational suitability. Tapped coordinates and local lookups are processed on the device; online map tiles are requested from the selected map provider for the visible area.

### Download offline map areas

Offline tile downloads require a supported native build with the MapLibre native renderer. The Replit browser preview or Expo Go may show measurements but not provide native tile-download controls.

1. Open **Map → Offline maps & layers**.
2. Select one layer:
   - **OpenStreetMap** — OpenFreeMap vector tiles with OpenMapTiles/OpenStreetMap attribution.
   - **Topographic** — Geoscience Australia 1:250,000 map layer.
   - **Satellite** — dated NASA VIIRS browse imagery, with a maximum zoom of 9.
3. Choose **Current map view**, **Preset region**, or **Enter coordinates**.
4. For a preset, select Australia or one of the available states/territories. Presets are rectangular bounds and can include neighbouring areas.
5. Choose the maximum detail zoom. Check the estimated tile count and size, then select **Download offline map**.
6. Pause, resume, refresh or delete a saved map from the **Saved offline maps** list.

The app applies tile/size safety limits; a large area may need a lower zoom or smaller bounds. Downloading requires an internet connection. The selected provider receives requests for the map area and ordinary network connection details such as your IP address. The provider may also have its own service limits.

Map layers are reference material, not official aviation charts. Topographic detail is limited by the source scale; satellite imagery may be dated or cloud-obscured. Keep map attribution and check current official documents.

### OpenAIP reference

In **Map → OpenAIP reference (AU)**:

- **Check versions** checks the public Australian export listing.
- **Download AU data** explicitly downloads and validates public airport/airspace exports. No API key is required for the public files.
- Use the overlay switch to show or hide the downloaded map layer; search or tap records for source details.
- To fetch an API detail for a selected record, enter your own OpenAIP key in the personal-key area and explicitly choose its fetch/refresh action. This is optional and separate from public downloads. Device authentication must be set up in a supported native build; the browser preview and Expo Go do not offer weaker key storage.
- **Remove key** removes the optional key, not the downloaded records. **Remove downloaded data** removes the local downloaded snapshot and API detail cache, not the key, bundled data, tile packs or imported packs.

OpenAIP is a partial, uncertified secondary reference. The map's point lookup is two-dimensional and does not filter by altitude, time or NOTAMs. Airport proximity does not establish which frequency applies, and no result does not mean clear airspace. Confirm frequencies and airspace with current official information. Read the [OpenAIP download notes](../artifacts/anc-uav/content-packs/OPENAIP_DOWNLOADS.md) for attribution, licence and device-storage details.

## 4. Build profiles for your ReOC

Profiles put your own operator-manual figures on Aviate. ANC UAV stores what you enter; it does **not** verify a ReOC, read your manuals, approve a profile, determine whether VLOS/EVLOS/BVLOS is authorised, or calculate limits from the operation label.

### Create a first profile

1. Go to **Settings → Profiles → Manage → New profile from starter**.
2. Enter the **Operator / ReOC** label for the organisation whose manual governs the operation. You can select an existing operator label or enter a new one.
3. Give the profile a meaningful **Profile name**, for example `Baseline RPAS` or `Survey operations`.
4. Enter a unique **Version label** within this profile. Include a manual version or date if useful, for example `Manual 4.2 — 2026-11`.
5. Select the operation type: **VLOS**, **EVLOS**, **BVLOS**, or **Custom**. A custom operation also needs a short description. This is a label only; it does not alter any number or establish approval.
6. Add a concise **Manual reference** and optional **Effective note**. For example, record the manual title, revision and section where you checked the values. These fields are notes only; the app does not import or verify the manual. Do not enter passwords or credentials.
7. Check and replace the four limits with the figures from your approved manual:
   - Maximum height AGL — metres
   - Distance from people — metres
   - Crewed-aircraft vertical separation — feet
   - Crewed-aircraft horizontal separation — metres
8. Review the aircraft list. The starter values are **Mini — 500 m**, **M30T — 1,000 m**, and **Matrice 4/5T — 800 m**. These are unverified starting figures, not manufacturer limits or regulatory advice.
9. Add, edit or remove aircraft using the **Aircraft distances (metres)** editor. You can save up to 24 aircraft in a version. For each one, enter the aircraft name and the distance from the home point stated by your manual, plus an optional source/version note. Confirm each change in the editor, then save the entire profile version.
10. Select **Save version**. A newly created or duplicated version is **not** automatically active.
11. Return to the saved version list and press **Use version** beside the exact version you intend to use. Confirm Aviate shows that operator, profile and version as **In use**.

If no version is selected, Aviate shows no profile limits. The app does not silently choose another ReOC, a newer version or the starter values.

### Separate ReOCs and keep revisions

- Create a separate profile for each operator/ReOC. The ReOC label identifies the whole profile and all of its versions.
- Versions within a profile are complete, independent sets. They can represent different operation labels (such as VLOS, EVLOS and BVLOS), manual revisions, aircraft fleets or effective periods.
- Only **one profile version is active across the app at a time**. Selecting another version replaces the displayed set on Aviate. ANC UAV does not keep one active version per ReOC.
- Use **Add new version** when you want to preserve an earlier set. It copies a saved version into a new draft; review every limit, aircraft and source note before saving.
- **Edit** changes that saved version. If it is active, its saved changes appear on Aviate immediately. Add a new version instead when you need to preserve a historical version.
- **Duplicate as new profile** starts another profile from a saved version. Check the operator/ReOC label carefully before saving so the new profile is not left under the wrong operator.
- Changing an existing profile's operator/ReOC name or profile name applies to all its versions. If an existing profile belongs to another ReOC, create a separate profile instead of renaming it casually.
- Delete and restore actions require confirmation. Deleting an active profile/version clears the selection. Restoring starter figures resets only that version and clears its manual/effective notes.

### Back up or transfer profiles

Settings offers **Export profiles backup** and **Import profiles from Files**:

- The export is plain-text JSON and is **not encrypted**. It contains profile/ReOC names, version labels, operation labels, notes, limits and aircraft lists. Store or share it carefully.
- The export does not contain the active selection, contacts, credentials, device preferences, agency packs or incident notes.
- Import first previews new, identical and conflicting versions. Saved versions remain unless you choose to replace each conflicting version. Import does not switch the active profile unless you explicitly choose a version in the preview.
- Keep a copy in a secure location that you control. The app has no cloud sync or developer recovery service.

For the full data/storage rules, see [Operating profiles](../artifacts/anc-uav/OPERATING_PROFILES.md).

## 5. Communications and content

### Comms

**Comms** separates incident/sector FCTAFs, statewide references, airport-associated frequencies and imported spatial rules. A fire-incident assignment must be recorded from information supplied to the operator; the app does not allocate one or infer one from GPS. A recorded assignment is not independently verified.

Community airport data and OpenAIP overlays are unverified secondary references with unknown or incomplete coverage. Nearby aerodrome distance alone does not establish the applicable CTAF. Spatial lookup depends on the actual records installed and their stated limits. Confirm the correct frequency and applicable rules against official current documents before transmitting.

ANC UAV has no emergency-call button or 000 calling function. Saved contacts are operational contacts only; use your device's native emergency-calling feature for emergencies. In Multi-Crew mode, the internal-communications prompt is a reminder to communicate within the crew, not a call service.

### Library and local documents

Use **Settings → Content & privacy → Packs and library** for installed content and documents. Local navigation packs are separate from Map's managed OpenAIP downloads.

Use **Reference snapshots & updates** only for material you are authorised to store offline. Obtain it through the provider's permitted channel, confirm the rights and intended use for your operator, and then import the local manifest and matching file. The import is not an Airservices or NAIPS download; it does not bypass a sign-in, grant storage rights or verify the file. Dates, source and permission statements remain user-supplied and unverified. See [Authorized local reference snapshots](../artifacts/anc-uav/content-packs/REFERENCE_SNAPSHOTS.md) before importing.

## 6. Tools

Open **Tools** and expand the required section:

- **NOTAM · plain English** — pastes a notice into a limited local parser. It does not retrieve current NOTAMs, verify currency or understand every code. Unsupported text remains visible; use the official notice.
- **MET briefing · plain English** — locally reads only a supported subset of supplied METAR/SPECI/TAF and briefing text. It does not verify the latest issue or replace an official briefing. Pasted content remains temporary in app memory; use **Clear text** when finished.
- **Distance converter** — converts kilometres and nautical miles.
- **Coordinate distance & bearing** — calculates straight-line distance and initial true bearing between two entered points, or a one-time GPS origin and a destination.
- **Aerodrome distance comparison** — an unverified reference aid, not a radio-frequency or clearance decision.
- **Wind & temperature comparison** — mockup figures, not aircraft-approved limits or a forecast.

Calculations do not show flight clearance, terrain/obstacle separation or safety suitability.

## 7. Display settings and contacts

In **Settings → Display**, choose:

- **Mode:** Auto, Day or Night.
- **Text size:** Normal, Large or XL.
- **Default distance unit:** km or NM.
- **Crew priority order:** Solo or Multi-Crew.

These choices change the display and priority layout, not operating limits. In Aviate, tapping the crew COM priority when Multi-Crew is selected shows the internal-communication reminder and the Aviate content. The app still does not provide emergency communications.

In **Settings → Contacts**, add or remove operational names and numbers. Tapping a contact uses the device's calling interface; the mobile carrier and called party then handle the call. ANC UAV cannot place 000 calls.

## 8. Troubleshooting

### GPS is unavailable or permission was denied

- Check device **Settings → Privacy & Security → Location Services** (wording may vary by iOS version) and allow ANC UAV while using the app.
- Return to the feature and press its GPS action again. If permission was permanently denied, use the app's **Open device settings** control where shown.
- You can still use manual coordinates or map taps in features that offer them. No background location permission is needed.

### Weather is not loading

- Confirm the non-commercial/location-sharing consent is selected and then press **Use GPS for weather**.
- Check internet access and current location permission. An existing saved forecast is not automatically refreshed.
- If this is a commercial operation, do not use the current free Open-Meteo endpoint. The app's other reference features are separate from this weather-service restriction.
- An older saved forecast may be shown for offline use; check its timestamp and age. **Clear saved weather** removes the cache and consent.

### Offline map download is unavailable or fails

- Use a supported native iPhone/iPad app build; browser preview and Expo Go may not have native offline tile storage.
- Check internet access, available device storage, area bounds and estimated tile count/size. Reduce the area or maximum zoom if the app's safety limits are exceeded.
- A public map provider may be unavailable or may limit requests. Retry later or choose another supported layer. Do not assume a partial download is complete.

### OpenAIP download or key problem

- Public exports do not require an API key. Use **Check versions** or **Download AU data** from a native build when online.
- The optional personal key is only for explicit Core API details. It requires a native build and device authentication; key entry is unavailable in a browser or Expo Go.
- Check the visible status and retry after an indicated network/rate-limit cooldown. Removing the key and removing downloaded data are separate actions.
- Do not email the key to support. Support cannot retrieve or reset a key saved on your device or a key issued by OpenAIP.

### Profile does not appear on Aviate

- In **Settings → Profiles → Manage**, confirm the profile version was saved and then press **Use version**.
- Check the ReOC, profile name, version label and active indicator. Draft aircraft changes are not saved until you save the entire profile version.
- If no version is active, the app deliberately displays no limits. It will not choose one automatically.
- If the app reports that saved profiles could not be loaded, use **Reload saved profiles**. Do not reset local data or reinstall before preserving any backup you need.

### Storage warning or failed import

- A failed save/import should leave the existing saved information unchanged. Read the on-screen error and try again only after checking available device storage.
- Do not clear app data, remove the app or reset a store as an initial troubleshooting step. Local-only data has no ANC UAV cloud recovery.
- Profile export files are unencrypted; secure them before sending or importing.

## 9. Contact support safely

Email **[support@ignisse.app](mailto:support@ignisse.app)**. To help us investigate, include:

- App version, device model and iOS version.
- The tab and feature you were using.
- The steps you took and what happened compared with what you expected.
- Whether the device was online or offline and, if relevant, the visible provider error/status.

Before attaching a screenshot, remove or cover precise coordinates, home/incident locations, contact names/numbers, ReOC details, incident identifiers, briefing text, credentials and API keys. Do not email passwords, authentication codes, OpenAIP keys, private manuals, NAIPS briefings, incident reports or restricted operational documents. If support needs diagnostic material, ask first and agree how to share only what is needed.

Support email is ordinary email, not an emergency channel or a secure operational data-transfer system. If your issue concerns an urgent flight or emergency, use your approved operational procedures and device emergency services, not ANC UAV support.
