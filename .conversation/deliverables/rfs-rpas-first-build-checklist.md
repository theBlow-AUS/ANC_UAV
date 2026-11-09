# First-Build Checklist

## Aviate.Navigate.Communicate (ANC UAV)

**Project/app name:** Aviate.Navigate.Communicate (ANC UAV)  
**Version:** 0.3  
**Basis:** Product Requirements Document v0.8 and Offline Data & Security Comparison  
**Status:** Prioritised implementation plan — no app or integration has been built yet

## Priorities

- **P0 — Gate:** decide or prove before dependent work starts.
- **P1 — MVP:** required for a controlled multi-operator offline pilot.
- **P2 — Follow-on:** add after the core is accepted and source rights are confirmed.
- **P3 — Stretch:** explicitly not part of the first release.

**Recommended first release:** an offline field kit on independently enrolled operator devices, with an authorized NSW RFS content pack as the initial focus. Keep the app shell/content model reusable, but do not promise other agency packs until the separate follow-on and its import/approval/rights gates are passed. Make the approved RFS QRG/local workflow useful before activating any external account integration. Keep fee-based and rights-gated feeds disabled until confirmed and approved.

---

## 0. Establish the release and safety baseline — P0

- [ ] **Name the operational approver.** Record who can approve QRG/SOP content, limits, checklists, contacts, radio scripts, and release readiness.
- [ ] **Confirm the first distribution audience.** Plan for multiple operators, not only the requester; identify eligible users and target devices without implying agency endorsement.
- [ ] **Record the agency scope.** The first approved pack is NSW RFS-focused; the reusable product name and core app are not RFS-branded or restricted by design. Do not imply RFS endorsement without approval.
- [ ] **Separate app capability from policy content.** Keep NSW RFS procedures, default FCTAF, radio scripts, checklist variants, and contacts in a jurisdiction/agency pack—not universal app constants.
- [ ] **Choose the first-release distribution path.** Target iOS App Store readiness for iPhone and iPad first; decide signing, TestFlight/pilot path, support contact, and any distribution fees. Android is a later separate phase, not an iOS-build claim. No release has been authorized.
- [ ] **Set the iOS device baseline.** Select minimum iOS version and tested iPhone/iPad models, including portrait and landscape, iPad window/multitasking support, minimum storage, camera/biometric requirements, and whether agency-managed devices are in scope. Scope Android devices only during its later release phase.
- [ ] **Assign App Store compliance ownership.** Name who maintains the checklist against Apple’s current App Store Review Guidelines, Human Interface Guidelines, App Store Connect privacy disclosures, licensing, and SDK privacy-manifest/required-reason API requirements where applicable.
- [ ] **Prepare the product disclosures.** Plan an in-app About/Help/privacy area and supporting user/support/release documents that state the app name, first RFS pack scope, future agency-neutral roadmap, pack/source/version/approval states, import and redistribution limits, iOS device/orientation/version support, Android-later status, offline behavior, update freshness, data flows, vault limits, safety limitations, support, and approved distribution/endorsement claims.
- [ ] **Prepare App Review access.** Design an offline/demo mode with synthetic data so reviewers can inspect the product without real operator credentials or restricted provider data. Apple review/approval is not guaranteed.
- [ ] **Define privacy and record handling.** Approve local mission-note fields, retention, deletion, backup, export, device-loss response, and support-log policy.
- [ ] **Create a source/rights register.** For every document, dataset, image, and provider, record owner, licence/terms, intended user/device count, offline storage and parsing rights, refresh method, effective date, retention, permitted exports, and reviewer.
- [ ] **Record local-import boundaries.** Future user-imported manuals/rules require rights to store/process on the device; that permission does not automatically allow redistribution, extraction into app logic, or use by other operators.
- [ ] **Resolve supplied source control.** Ask the content owner to confirm the QRG revision and approval, verify the RFS SOP filename/footer version discrepancy, and confirm current contacts/checklist changes.
- [ ] **Record the Airservices position.** There is no existing agency data agreement. Do not activate AIP/NAIPS adapters or camera caching until intended access, local storage/parsing, multi-operator distribution, retention, authentication, and cost are confirmed.
- [ ] **Separate authentication from permission.** For each provider, document: sign-in method; user entitlement; permitted app automation; download/storage rights; redistribution rights; and any charge.
- [ ] **Set a data-cost approval ceiling.** No paid Airservices, weather, maps, hosting, or API service is enabled without an explicit cost and licence decision.
- [ ] **Write the non-goals into the pilot brief.** No flight-clearance claims, no AVCRM MVP dependency, no shared/team account, no shared-device profile switching, no central login, no remote wipe, and no Replit runtime service.

**Gate 0 exit:** named safety/content approver, multi-operator audience and iPhone/iPad portrait/landscape target identified, distribution/privacy/App Store owners assigned, and an initial rights register exists. Unlicensed materials stay out of the operational build.

## 1. Prove the native technical foundation — P0

- [ ] **Start with a compiled Expo/React Native native app.** Do not build the delivered product as a Replit-hosted web page or rely on Expo Go for secure-storage sign-off.
- [ ] **Prove local persistence.** Store a test document, checklist state, mission note, and source manifest in app-controlled durable files/SQLite; restart and reboot in airplane mode.
- [ ] **Prove local search/indexing.** Test full-text and spatial queries against a small synthetic fixture, including missing fields, duplicate data, and a schema-version migration.
- [ ] **Prove the map engine on iPhone and iPad.** Test MapLibre/native rendering in portrait/landscape with a permitted offline package and locally supplied style, fonts, glyphs, and sprites. Verify there are no hidden network-dependent assets.
- [ ] **Check map-pack size.** Package a representative region, measure install/download/storage size, and verify low-storage failure does not corrupt installed data.
- [ ] **Prototype iOS secure storage on real devices.** Test Keychain access control, OS biometric/device verification, cancel/failure handling, device-only settings, biometric invalidation, backup and iOS reinstall behavior. Defer Android Keystore tests to the Android phase.
- [ ] **Record security limits accurately.** Document iOS key protection that is actually verified; for Android, validate hardware-backed/StrongBox capability only in its later release phase.
- [ ] **Define the app's allowed network destinations.** Start with none. Add provider destinations only when required, reviewed, and approved. No Replit endpoints, connectors, proxy, hosted AI, telemetry, authentication, licence check, or mandatory update call.
- [ ] **Use local formats that can be independently backed up or replaced.** Keep public reference packs separate from secrets and sensitive mission data.
- [ ] **Create a repeatable release-build network audit.** Plan DNS/request tracing for startup, map, update, authentication, image, analytics, crash-reporting, and export flows.

**Gate 1 exit:** core local workflows survive airplane mode on target iPhone/iPad builds; map, Keychain, orientation and iPad window-size behavior work on real devices; the app works with Replit destinations blocked; and pack-size/security assumptions are evidenced.

## 2. Build the app shell and local data model — P1

- [ ] **Create the primary navigation.** Include dedicated tabs or equally direct entry points for Quick Reference, Map, Checklists, Communications, and local operational records; put Downloads/Accounts in an obvious Settings or management location.
- [ ] **Build adaptive layouts, not a scaled iPhone screen.** Adapt navigation, map, checklist and communication panels to iPhone/iPad available widths and regular/compact size classes; support portrait, landscape and declared iPad multitasking/resizable windows.
- [ ] **Design field status once.** Define a reusable status display for offline/online, GPS and accuracy, manual pin, data coverage, installed version, stale/unknown source, vault lock, sign-in state, and authorization state.
- [ ] **Make source states distinct.** Provide separate “not installed,” “download available,” “downloading,” “validating,” “installed,” “future-effective,” “expired,” “stale,” “authentication required,” “permission required,” and “failed” states.
- [ ] **Define the content manifest.** Store product/source ID, issuer, version/cycle, effective dates, coverage, licence/use flags, approver, parser version, install time, and last successful check.
- [ ] **Define provenance links.** Each extracted operational value must link to its source document, page/record, version, parser, and review state.
- [ ] **Make the data model agency/jurisdiction-aware.** Keep issuer, geographic/jurisdiction scope, pack identity, active context, and approval state as content metadata—not assumed app-wide settings or RFS constants.
- [ ] **Keep operator context local.** Let an operator use a local descriptive profile if needed, while clearly stating that a typed name/role does not verify identity, qualifications, or authority.
- [ ] **Create a blank-state experience.** The app remains useful before account setup or data download; no mandatory sign-in, network check, or data subscription at launch.
- [ ] **Write the first navigation and content wireframes.** Check readable offline QRG, map hand measurements, frequency categories, and data/download status before coding high-detail UI.

## 3. Implement the offline package/update engine — P1

- [ ] **Build the product catalogue.** Show source, version, geographic coverage, effective date, data age, permission state, size, installed state, and required storage.
- [ ] **Allow user-selected packs.** Let operators choose region/document/mission scope rather than downloading all of Australia by default.
- [ ] **Support authorized local import.** Provide a file picker and distinguish user/agency-authorized files from sources the app is not permitted to import or redistribute. Import is not a licence workaround.
- [ ] **Support authorized direct download.** Use approved HTTPS endpoints only; respect authentication, provider terms, size limits, rate limits, Wi-Fi preference, cancellation, retries, and resumability where available.
- [ ] **Stage before install.** Download to a temporary location; verify file integrity and any publisher/agency signature; parse and validate before activating.
- [ ] **Make updates transactional.** A bad download, malformed archive, parser error, interrupted transfer, or low storage must leave the last valid installed package usable.
- [ ] **Keep cycles compatible.** Prevent mixed aviation data cycles or a publication amendment applied to the wrong base edition.
- [ ] **Keep packages data-only.** Accept documents and validated data records only; reject code, scripts, plug-ins, or downloaded modules that add/alter features. Parser/feature changes ship through a signed app update.
- [ ] **Represent effectiveness accurately.** Keep future, effective, superseded, expired, stale, and never-verified packs distinct.
- [ ] **Pin mission provenance, not stale status.** Record the versions used by a mission; still surface later safety-relevant changes and never imply the pinned copy remains current.
- [ ] **Add foreground update controls.** “Check for updates” and “Update selected” work on demand. Background refresh is best-effort only; do not promise closed-app updates.
- [ ] **Redact transfer metadata.** Store original product content only, not passwords, Authorization headers, cookies, refresh tokens, or arbitrary diagnostic dumps.
- [ ] **Test recovery, deletion and storage pressure.** Include full disk, interrupted network, checksum mismatch, wrong file type, path traversal, decompression bombs, and deletion of obsolete data where permitted.

**Gate 2 exit:** one synthetic source pack can be imported/downloaded, validated, installed, searched, used offline, updated safely, and rolled back without mixed data or a backend.

## 4. Ship approved local field workflows — P1

### Documents and dedicated Quick Reference

- [ ] **Implement the document vault.** Browse/search approved, licensed offline materials and show source, revision/effective date, and approval status.
- [ ] **Build Quick Reference as its own main tab.** Preserve the supplied two-sided card groupings: “Fly & Navigate” and “Communicate & Administrate.”
- [ ] **Make QRG text accessible offline.** Use selectable/searchable text and a print-style view; retain source wording and warnings without silently paraphrasing or changing operational limits.
- [ ] **Link to related functions.** Radio templates open Communications; distance/bearing references open the map measurement flow.
- [ ] **Mark app-added content clearly.** Keep the supplied mockup source distinct from reviewed native additions, and do not imply unapproved additions are part of the controlled QRG.
- [ ] **Do not distribute until rights are confirmed.** Confirm the multi-operator licence/approval of the QRG and SOP, including any third-party material within them.

### Checklists and notes

- [ ] **Build distinct checklist stages.** Keep pre-flight, pre-start, and post-flight separate.
- [ ] **Use approved aircraft-specific variants only.** Show the source/version and selected aircraft; never carry completion into a different aircraft or stage.
- [ ] **Save progress locally.** Resume incomplete checklists after app/device restart; make abort/incomplete states explicit.
- [ ] **Build local mission notes.** Allow approved fields, notes, timestamps, and optional manual aircraft position without cloud sync.
- [ ] **Do not imply AVCRM submission.** A local completion is not recorded in AVCRM, submitted for approval, or proof of operational approval.

### Exports and operator separation

- [ ] **Build operator-isolated installs first.** Each operator uses their own device/install, vault, session, mission data, checklist state, and saved locations.
- [ ] **Keep exports opt-in.** Preview selected fields before export. Exclude passwords, tokens, session data, restricted pack files, and unselected precise locations by default.
- [ ] **Make diagnostics opt-in and sanitized.** Default to app/source/parser versions and non-secret error codes, not mission content or location history.
- [ ] **State support limits.** No developer credential recovery, remote vault inspection, app-operated remote wipe, or instant revocation of offline copies.
- [ ] **Do not claim RFS endorsement.** Obtain brand/content distribution approval before using marks or distributing agency materials beyond the authorized audience.

**Gate 3 exit:** operators can install and use approved documents, QRG, checklist, and local mission records offline; data remains separated by installation; exports and support output are understood and safe.

## 5. Add map, measurements and distances — P1 after data approval

- [ ] **Choose a permitted offline ground-map source.** Test an OSM-based package under its licence or another explicitly offline-usable source. Never bulk-download `tile.openstreetmap.org`.
- [ ] **Keep the base map separate from aviation sources.** The ground map does not certify the accuracy/completeness of aerodromes, CTAF zones, restricted areas, or clearance.
- [ ] **Implement current-device GPS and map-tap origin.** Show fix accuracy, time and provenance; manual taps must never be labelled as current GPS.
- [ ] **Represent aircraft position separately from operator/device position.** Require explicit aircraft-point confirmation before filling a radio script.
- [ ] **Add point-to-point distance/bearing.** Label bearing direction both ways; preserve “aircraft from reference” wording for radio use. Confirm the approved bearing convention before transfer.
- [ ] **Add the km/NM converter.** Use 1 NM = 1.852 km, preserve precision internally, and display appropriate rounding.
- [ ] **Select authoritative aerodrome data.** Confirm coordinate, aerodrome type, controlled/uncontrolled status, data date, coordinate reference system, licence, and update path.
- [ ] **Select locality data.** Show the meaning and uncertainty of the gazetteer point; do not present it as an exact locality boundary or safety-life position.
- [ ] **Do not calculate “nearest applicable frequency” from community data alone.** Keep unapproved sources out of safety-critical frequency results.
- [ ] **Test all missing-data cases.** Incomplete, stale, uncertain, or absent data must show a coverage limit—not “none applicable.”
- [ ] **Keep proximity advisories out of the pilot unless approved.** No alert threshold is a flight authorization.

**Gate 4 exit:** GPS/map-tap measurements and converter pass acceptance tests; any nearest aerodrome/locality results use an approved licensed source with known coverage. Until then, use synthetic test fixtures or clearly non-operational prototypes.

## 6. Build Communications and the frequency panel — P1 framework; source-gated

- [ ] **Preserve approved script text.** Keep source wording fixed; only approved fields are editable.
- [ ] **Keep operator, aircraft and reference points distinct.** No silent copy of device GPS into aircraft position.
- [ ] **Separate frequency types in the UI and data model.** NSW default FCTAF, incident/sector FCTAF, aerodrome CTAF, published airspace/CTAF broadcast-area frequency, and Area/FIA/ATC/tower frequency are different types.
- [ ] **Include the sourced NSW default reference separately.** Keep 132.55 MHz versioned and scoped to its current RFS rule; do not label it an incident assignment or generic nationwide aviation frequency.
- [ ] **Allow manual recording of received incident FCTAFs.** Preserve assignment source, time, area/sector, validity and change history. Do not allocate/change an FCTAF or infer it from the nearest incident.
- [ ] **Select a licensed authoritative data source.** Validate aerodrome points/frequencies plus broadcast-area polygons, vertical limits, schedules, applicability and currentness. One dataset may not cover all these categories.
- [ ] **Return every matching published area.** Allow GPS or map-tap lookup; use altitude/time where required; show overlapping matches and the reason each applies.
- [ ] **List Area/FIA/ATC separately.** Do not label all frequencies as CTAF or imply FCTAF replaces any applicable ordinary channel.
- [ ] **Keep script population explicit.** Show the frequency source and require user confirmation before use.
- [ ] **Fail closed on missing or stale sources.** Never show an empty lookup as evidence that no CTAF applies.
- [ ] **Review radio timing and bearings with the operational approver.** Do not promote the mockup's calls/timing to reminder logic without approval.

**Gate 5 exit:** approved scripts and representative authorized dataset fixtures pass overlapping-area, altitude/time, stale-data and aircraft-position tests. If complete licensed data is unavailable, show the frequency feature as incomplete—not operationally complete.

## 7. Add the Accounts & Security vault — P1 framework; provider activation separate

- [ ] **Create provider-specific profiles.** Do not create a universal “AIP login.” A public AIP publication, Airservices subscription, NAIPS account, and CASA/myCASA account are distinct.
- [ ] **Use platform secure storage.** Implement Keychain/Keystore-backed storage in a native release build; no credentials in SQLite, ordinary preferences, source code, Replit, files, or support logs.
- [ ] **Require OS-enforced user presence.** Test biometrics/device authentication and cancellation on real iOS/Android hardware. No custom PIN-only “vault” fallback.
- [ ] **Use device-only/no-sync protection.** Verify iOS accessibility, Android backup/device-transfer exclusion, biometric-change invalidation, restore, reinstall, passcode removal and deletion behavior.
- [ ] **Prefer a supported scoped token flow.** Use the system browser and provider-hosted identity/MFA when officially supported.
- [ ] **Never collect myID credentials.** Do not intercept provider login or MFA, and do not claim a CASA connection until a usable supported app flow is established.
- [ ] **Save passwords only where permitted and necessary.** User chooses on-device; provider support/terms must allow the specific app use.
- [ ] **Keep states separate.** Show vault locked, signed in, session expired, entitlement, and permission to automate/download as distinct states.
- [ ] **Prevent credential leakage.** Block secrets from URLs, redirecting to unrelated domains, source archives, clipboard features, analytics, crash logs, mission exports and Replit.
- [ ] **No silent background unlock.** If a refresh requires a locked secret, show “unlock required”; do not weaken access controls to improve background updates.
- [ ] **Implement explicit deletion and disconnect.** Explain that app deletion may not end a browser/provider-owned session, and that provider-side revocation is separate.
- [ ] **Be precise about the promise.** No developer key, server copy, remote inspection or recovery mechanism. Do not claim immunity to a compromised process or malicious replacement build.
- [ ] **Do not activate Airservices adapters based on credentials alone.** The user confirmed no existing agency agreement. Obtain the required written app-use and multi-operator permissions, supported interface, retention/storage rights, and cost approval first.
- [ ] **Do not scrape NAIPS or the CASA portal.** If a provider has no authorized mobile flow or the interface needs a confidential server secret, leave the adapter disabled. Never add a Replit proxy.

**Gate 6 exit:** secure-storage and isolation tests pass on real devices. Each service separately passes provider authentication, entitlement, automation permission and multi-operator distribution review before connection is enabled.

## 8. Add rights-approved external data modules — P2

- [ ] **AIP and associated publications:** implement offline document packages only for permitted materials. Preserve originals and edition/effective dates; apply amendments only to the matching edition and only when licensed/validated.
- [ ] **NAIPS briefings:** if separately authorized and cost-approved, start read-only. Store briefing scope/reference, receipt/issue/validity times, source products, updates, cancellations and replacements. Offline cache is a snapshot, never proof of no new NOTAM.
- [ ] **Weather cameras:** only retrieve/cache if automated access, aviation use, retention and redistribution are confirmed. Label snapshots with capture time and download time; re-download does not make an old image fresh.
- [ ] **Weather:** show provider/source time and forecast validity. Manual values stay identified as manual; an alternate data source is not silently presented as NAIPS.
- [ ] **NOTAM explanation:** use deterministic local parsing only for validated patterns; retain source text, uncertainty, effective periods and replacement/cancellation relationships.
- [ ] **Incident feeds/notifications:** only approved feeds; preserve source, refresh time and offline-stale state. Do not promise closed-app alerting without a separately approved push service.
- [ ] **Re-run cost and privacy review per adapter.** No paid product calls, analytics, location transfer, or new login until expressly approved.

## 9. Release, field-test, and controlled-pilot gates — P0 before distribution

- [ ] **Test the MVP acceptance scenarios.** Cover AT-01–04, AT-11–16, AT-17–27, AT-30–47; AT-28/29 are additionally required if NAIPS/camera features are included.
- [ ] **Run a signed-build Replit network audit.** Trace startup, maps, fonts, sign-in, updates, downloads, export, telemetry, and third-party SDK traffic; block Replit destinations and confirm all local features work.
- [ ] **Run a signed iOS build Replit network audit.** Trace startup, maps, fonts, sign-in, updates, downloads, export, telemetry, and third-party SDK traffic; block Replit destinations and confirm all local features work.
- [ ] **Test zero-network and degraded-network states.** Start/restart in airplane mode, interrupt downloads, disable GPS, use poor GPS, fill device storage, and test stale/future/expired packages.
- [ ] **Test two independent operator installations.** Confirm no credentials, missions, checklists, markers or locations cross between test devices.
- [ ] **Test security failure cases.** Include canceled biometrics, failed auth, invalidated keys, restore/device migration, iOS reinstall, provider session expiry, logs, exports, and support diagnostics.
- [ ] **Test field usability.** Sunlight, low light, gloves, large touch targets, readable source status, tab/navigation clarity, offline startup and app restart on iPhone and iPad.
- [ ] **Rotate and resize every core workflow.** Use iPhone/iPad portrait and landscape, supported split/resizable iPad windows, keyboard open/closed and larger system text; verify no clipped controls and no lost edits, checklist progress, map pins, mission fields, or selected reference.
- [ ] **Validate compatibility content.** Confirm the supported iOS range and tested devices shown in-app and in supporting documents match the build and metadata. State Android is planned later and not currently supported.
- [ ] **Test data-manager fault recovery.** Malformed archive, bad signature/hash, incomplete schema, wrong coordinates, unknown altitude datum, incompatible cycles, interrupted install and rollback.
- [ ] **Confirm the complete source register and licence evidence.** Each content item has an owner, version/effective date, audience/device scope, storage/update permission and expiry/review trigger.
- [ ] **Confirm app release details.** App name/branding, privacy notice, support route, target devices, signed distribution, release notes and per-operator onboarding; do not state official RFS endorsement without approval.
- [ ] **Have the operational approver sign the pilot scope.** Unreviewed QRG mockup material, unapproved contacts, uncertain frequency data, and unsupported limits are not displayed as approved rules.
- [ ] **Record known limitations in the app and release notes.** No official source means “unknown/not available,” not “all clear.” Offline data may be stale; absence of an alert is never permission to fly.
- [ ] **Re-check Apple's current rules at submission.** Keep dated evidence for App Store Review Guidelines, iPhone/iPad compatibility, accurate listing/screenshots, privacy labels/details, public privacy policy and support link, applicable privacy manifests/required-reason APIs, content rights and reviewer instructions.
- [ ] **Provide review mode without real user data.** Reviewers can exercise core offline features and understand gated providers through synthetic demo content; no live NAIPS/CASA/password is used as a shared test credential.
- [ ] **Publish consistent supporting documentation.** Make the app’s About/Help and supporting user guide/privacy/support docs state tested iPhone/iPad portrait/landscape support, iOS version range, Android-later status, offline and update limitations, secure-vault boundaries, safety non-approval disclaimer, source/coverage limitations, and accurate agency endorsement status.
- [ ] **Do not promise approval.** Record that the project is prepared against applicable requirements but Apple makes the final review decision.

**Gate 7 exit:** required tests pass on target devices, licensed/approved content is available to the named pilot audience, zero Replit runtime traffic is demonstrated, costs and privacy are understood, and operational approval for a controlled pilot is recorded.

## iOS App Store release gate — P0 before iOS submission

- [ ] Freeze the iPhone/iPad and iOS support matrix; remove any platform/orientation claim not proven by device tests.
- [ ] Complete on-device crash/stability testing in portrait, landscape, keyboard, larger display text and supported iPad multitasking/window configurations.
- [ ] Verify app metadata, product name/branding rights, screenshots/previews, privacy answers, support URL and privacy-policy URL are complete and accurate.
- [ ] Review each data flow and third-party SDK for App Store privacy disclosures, privacy manifests, required-reason APIs, permissions and appropriate user-facing explanations where applicable to the actual build.
- [ ] Ensure the reviewer can inspect the app. Provide a built-in synthetic demo mode or other compliant reviewer access; do not expose actual operator credentials, agency records or unauthorized Airservices data.
- [ ] Make non-obvious offline, account-gated, safety-critical and permission-limited features explicit in App Review notes and supporting documents.
- [ ] Re-read the live Apple rules and HIG immediately before submission. Capture evidence, owner and sign-off date.
- [ ] Submit and respond to review; only claim “App Store approved” after approval is received. Compliance preparation does not guarantee review acceptance.
- [ ] Update public/in-app/support statements whenever Apple changes rules, app support, data flows or platform coverage.

## Deferred from the iOS-first release

- [ ] **Saved Watch Areas, layer state, markers, radius export, KML/KMZ:** Release 2, after map-pack and export rights are proven.
- [ ] **Weather dashboards, incident feeds, dynamic alerts, advanced NOTAM map intersections, proximity advisories:** Release 3, after authorized sources and approved rules.
- [ ] **Microsoft equipment-movement submission:** Release 4, only after endpoint, authentication, privacy and duplicate-handling approvals.
- [ ] **AVCRM:** P3 lowest-priority stretch goal; defer unless the vendor confirms supported API access, authentication, scope, sandbox and additional cost.
- [ ] **Shared-device account switching, shared credential vaults, cross-device/team sync, central admin, remote wipe:** not planned until separately authorized, funded and security-designed.
- [ ] **Android:** start only after the iOS pilot passes. Re-run platform secure-storage/backup, permissions, orientation/window-size layout, offline map/data, privacy/network, support/distribution and acceptance tests on supported Android devices before claiming Android support.

## Agency-neutral content-pack extension — P2 after the RFS-first pilot

- [ ] **Define a generic, versioned pack format.** Include issuer/agency, jurisdiction, source/title/type, edition and effective dates, geographic scope, rights, version, verification/approval status, and source references.
- [ ] **Build a local import flow for other operators' content.** Allow the user to select authorized manuals, rules, policies, checklists, contacts, and structured reference data from device storage without a cloud account or Replit callback.
- [ ] **Keep imported files intact and traceable.** Retain provenance and page/section references; expose unsupported formats as attributed documents rather than pretending to parse their operational rules.
- [ ] **Never infer approval from import.** Mark imported items unverified until an identified content owner reviews them; import does not prove agency membership, authority, currency, or accuracy.
- [ ] **Use only reviewed schemas/parsers for policy extraction.** Do not turn arbitrary manual text into operating thresholds, checklists, radio assignments, or permissions; no executable scripts/plugins or downloaded code.
- [ ] **Prevent cross-agency rule mixing.** Show the active jurisdiction/agency pack for each mission, checklist, and frequency result; show unknown or confirm-needed when a pack does not cover the context.
- [ ] **Apply use/distribution rights per pack.** Device-local permission is not redistribution permission. Require separate rights before bundling a user's materials or sharing them with another operator.
- [ ] **Prove the follow-on tests.** Pass PRD AT-48–52 for each supported schema, import workflow, and multi-pack context before advertising support to additional agencies.

## Checklist use

Work top to bottom within each gate. A later feature can be prototyped with synthetic data while a source decision is pending, but it must not be shown as operational or bundled for operators before its release gate passes. Keep this checklist beside PRD v0.8; update the version and decisions whenever an approver, licence, data source, OS target, agency pack, or safety rule changes.
