# Product Requirements Document

## Aviate.Navigate.Communicate (ANC UAV)

**Version:** 0.8 — agency-neutral content-pack roadmap  
**Project/app name:** Aviate.Navigate.Communicate (ANC UAV)  
**Status:** For operational and technical review  
**Product type:** Offline-first native mobile app (React Native / Expo), iOS first  
**Primary operating context:** Australian emergency-services RPAS operations

---

## 1. Product summary

The product is an agency-neutral offline RPAS field-operations app. The initial launch is focused on an NSW RFS content pack for approved operational references and common RPAS workflows; the reusable app shell is not permanently RFS-only. Its core capabilities must work without an internet connection. Network-dependent features such as live incidents, weather refresh, and form submission are optional supplements and must clearly show their source and freshness.

The installed app shall have zero runtime dependency on, or calls to, Replit services. Authorized reference data shall be stored and processed on-device, with an in-app download/import/parse/update manager. Airservices integration is a source-adapter and licensing question, not a dependency on Replit hosting or a Replit connector. Offline access means access to installed publications and received snapshots, not live NAIPS or live camera availability without connectivity.

The user confirmed there is no existing agency Airservices data agreement. Add a device-only credential/token vault for supported, authorized provider connections. End-user authentication, content entitlement, and permission for app automation/storage are separate gates; saving a personal login does not resolve all three.

Plan for distribution to other operators, not only the requester. The first-release baseline is independent installations on operator-controlled devices, each with its own local records and vault. This does not authorize release, imply agency endorsement, or add shared credentials, a cloud team account, or cross-device synchronization.

**Platform order:** ship iOS first for both iPhone and iPad; the app must work in portrait and landscape and adapt to supported iPad window sizes. Android is a later, separate implementation and release phase. App Store readiness is a requirement, but Apple's approval cannot be guaranteed by the product plan.

**Agency scope:** RFS/NSW is the initial policy, procedures, and operational-data context. A later release shall let other operators install/import manuals, rules, and policies belonging to their own agency or jurisdiction. Each imported pack must remain identifiable, versioned, locally sourced, and unverified until its responsible content owner confirms it. The app's core UI and data schema must avoid treating RFS rules or NSW frequencies as universal defaults.

The app is not an aviation authority, a substitute for approved procedures, or a flight-clearance service. It must not imply that the absence of an alert means a flight is authorized.

AVCRM is explicitly out of the MVP and remains a low-priority stretch goal, gated on vendor confirmation of supported API access, authentication, and cost.

## 2. Goals

1. Make approved operational documents and checklists available in the field without connectivity.
2. Help users access a map, saved operational areas, and local mission information quickly.
3. Make data freshness, GPS state, and sync state visible instead of hiding uncertainty.
4. Keep core operational data on the device and avoid dependence on a backend for core workflows.
5. Add external data or submission features only when their sources, licensing, security, and operational ownership are confirmed.
6. Keep Replit runtime/service usage at zero: no Replit-hosted backend, database, authentication, AI gateway, telemetry, licence check, or update proxy.
7. Keep agency-specific content separate from reusable app functionality so other organizations can add authorized content without forking the RFS-first core app.

## 3. Non-goals and exclusions

- Providing flight approval, legal advice, or a substitute for current CASA, RFS, AUAVS, or other applicable regulator/agency procedures.
- Guaranteeing live emergency alerts while offline, while the app is closed, or without a supported push service.
- Scraping private or undocumented AVCRM endpoints.
- Depending on AVCRM for the MVP.
- Treating automatically translated NOTAM text, cached feeds, or proximity calculations as authoritative clearance.
- Building a public incident reporting network or an unapproved incident data source.
- Automating, storing, parsing, or redistributing restricted Airservices content without the necessary permission; a free personal NAIPS account does not establish third-party app rights.
- Representing cached weather, NOTAMs, or camera images as live while offline.
- Requiring Replit or any compulsory paid cloud service to use the installed app's local functions.

## 4. Users and primary jobs

- **Pilot / field operator:** retrieve current approved references, work through checklists, record mission notes, and access a saved map area in low-connectivity conditions.
- **Operational reviewer / manager:** ensure the app contains approved, versioned operational content and that changes can be reviewed before distribution.
- **Maintainer / administrator:** manage approved sources and install reviewed data/document updates through the in-app data manager, without requiring an app-binary release for every data update.

These are functional roles, not assumptions about specific agency permissions or staffing structures. Planning assumes multiple operators using separate installations. A locally entered name/role or selected content pack is descriptive, not proof of membership, authority, qualification, or operational approval for any agency. No central identity or administration service is required for the MVP.

## 5. Product principles

- Offline first: core workflows remain available with no network.
- Uncertainty is visible: unknown, stale, approximate, and manually entered data are labeled.
- Source before automation: every safety rule and operational reference has an approved source and review date.
- Advisory, not authorization: warnings support judgment and never replace operational approvals.
- Local ownership: local data is not silently uploaded or discarded.
- Field usability: high contrast, large touch targets, concise screens, and clear status indicators.

## 6. Scope and release plan

### Release 0 — Discovery and safety baseline

Resolve source ownership, required operational procedures, contact verification, update process, offline map data and licensing, target devices, user roles, and data retention expectations. iOS is first, supporting iPhone and iPad in portrait and landscape; finalize the minimum iOS version/device matrix and size-class coverage. Android is deferred to a later platform phase. Validate the selected mapping stack and local storage approach on target iOS devices.

### Release 1 — iOS offline field kit (MVP)

- iPhone and iPad support in portrait and landscape with layouts responsive to iPad window/size changes
- Local document vault with search and offline viewing
- In-app Data & Downloads manager with local import, permitted direct downloads, local parsing/indexing, version/freshness visibility, and recoverable package installation
- Initial installed content and workflows focused on the authorized NSW RFS UAV/RPAS context; the app shell, product name, and content model are not RFS-exclusive
- Device-only Accounts & Security vault, with provider-specific connection support enabled only after authentication and permitted-use review
- Multi-operator onboarding, independent per-installation data/vaults, version/status visibility, and sanitized support/export flows; no shared-device account switching or team sync in the first release
- Dedicated Quick Reference tab for the supplied two-sided QRG
- Checklist workflow
- Mission notes / local operational record
- Approved radio-script builder
- Communications frequency panel separating NSW default FCTAF, incident/sector-assigned FCTAFs, aerodrome CTAFs, published airspace/CTAF broadcast-area frequencies, and other ATS frequencies
- Field Mode and clear device, GPS, and offline status
- Basic offline map with current location and manual pin, subject to mapping proof-of-concept
- Distance and direction measurement from current GPS or a tapped origin to aerodromes, localities, or another tapped point, subject to approved offline reference data

### Release 2 — Saved areas and spatial tools

- Saved Watch Areas and selected layer state
- User markers
- Radius drawing and KML/KMZ export

### Release 3 — Advisory data modules

- Manual weather entry and approved aircraft-specific limit configuration
- Optional cached weather and incident feeds from confirmed sources
- Airspace / aerodrome / HLS proximity advisories, only with validated datasets and approved rules
- NOTAM explanation with source text retained and explicit non-authoritative labeling
- Airservices publication/briefing adapters and weather-camera snapshots, activated only when source access, permitted use, and update handling are confirmed; adapter design belongs in the initial architecture

### Release 4 — Optional submissions and integrations

- Equipment movement form submission, if the target Microsoft endpoint supports an approved and secure client flow
- AVCRM integration only after vendor-confirmed API, authentication, entitlement, and pricing review

### Release 5 — Agency-neutral content packs (P2, after RFS-first pilot)

- Install/import authorized manuals, rules, policies, checklist sets, contacts, and structured reference data for additional agencies/jurisdictions.
- Keep each pack's issuer, jurisdiction, source/version, effective dates, rights, verification and approval status visible and separate.
- Add only reviewed content schemas/parsers; importing a file never installs executable code or automatically makes a safety rule authoritative.
- A selected policy context shall be explicit and shall not silently combine requirements from different agencies.

### Platform follow-on — Android (after iOS pilot)

Implement and release Android only after the iOS MVP has passed its pilot gate. Re-test native secure storage, backups, permissions, orientation/layout, maps, data updates, and privacy/network behavior on supported Android devices. Do not describe Android as supported in the iOS build or App Store listing before it exists.

## 7. Functional requirements

Priority definitions: **P0** = release blocker; **P1** = MVP; **P2** = follow-on; **P3** = deferred / stretch goal.

### FR-01 — Offline document vault (P1)

The app shall store approved manuals, SOPs, checklists, and quick-reference material locally on the device. Users shall be able to search available content and open it offline. Each document shall show a title, version or effective date where available, and its approval/source status.

**Dependencies:** approved source files; supported PDF/Markdown viewer; document update and removal policy.

### FR-01a — Dedicated Quick Reference tab (P1)

The main navigation shall include a dedicated Quick Reference tab that opens directly to the supplied two-sided RPAS Operator Quick Reference. It shall preserve the card's two groupings: Side 1, “Fly & Navigate,” and Side 2, “Communicate & Administrate.” Content shall be readable offline, searchable/selectable as native text, and available in a print-style view when useful.

The tab shall include the approved, versioned quick-reference topics: operating limits and aircraft separation, aircraft-specific VLOS limits, airspace/map legend, weather/NOTAM shorthand, radio scripts, emergency contacts, and the source's warning instructions. It shall show source, version/effective date, and approval status. The supplied QRG filename identifies a mockup and its current revision/approval metadata has not been confirmed; its content must therefore be reviewed before it becomes operational app logic. Preserve the “Uncontrolled when printed” copy-control notice where relevant; that notice alone does not mean a document is unapproved.

Quick Reference entries that have a corresponding interactive feature shall link to it. In particular, radio-script entries shall open the Communications section, and distance/bearing references shall open the map measurement tool.

The app's FCTAF panel is an additional capability, separate from the attached QRG's ordinary CTAF script. Keep the original PDF unchanged and identify any reviewed native-app additions distinctly.

**Dependencies:** operational approval of the supplied QRG content, controlled version metadata, and approval to bundle the material offline.

### FR-02 — Document update visibility (P1)

The app shall show the installed document version and whether an update is available when an update check can be performed. An unavailable network shall not block access to installed documents. The app shall not silently replace approved content during a session.

FR-17 defines the common in-app update pipeline. Data refresh shall not require a new app-binary release, a mandatory login, or a Replit service. An update check's success shall not be treated as proof that all NOTAM or weather information is current.

**Dependencies:** authorized source/distribution method and designated content owner. No backend is required for the core offline workflows.

### FR-03 — Checklist workflow (P1)

Users shall be able to open the approved checklist, record item status, and save progress locally. Checklist versions shall be identifiable. Any checklist item requiring a value or note shall preserve that input locally. The supplied SOP separates pre-flight, pre-start, and post-flight checks and includes aircraft-specific checklist appendices; the app shall keep these stages and aircraft variants distinct if the content owner approves their inclusion.

Local checklist completion shall not be labeled as recorded in AVCRM, submitted for approval, or operationally approved. The companion app does not remove external recording/approval obligations described in the supplied SOP merely because AVCRM integration is deferred.

**Dependencies:** approved checklist content and handling rules for incomplete or aborted checklists.

### FR-04 — Mission notes (P1)

Users shall be able to create and edit a local mission record with the fields approved for the MVP. Records shall include creation/update time and remain on-device until the user exports or a future approved sync feature is enabled.

**Dependencies:** stakeholders must define the minimum record fields, retention, export, and deletion rules.

### FR-05 — Radio-script assistant (P1/P2)

The app shall present only approved scripts and allow safe population of approved variable fields such as callsign, aircraft location, distance/bearing, duration, and frequency. The original approved script wording shall remain visible and must not be changed by an unreviewed language model or free-form generator.

The Communications section shall include separate **FCTAF** and **ordinary CTAF** entries. FCTAF means Fire Common Traffic Advisory Frequency, not an abbreviation for the ordinary CTAF-frequency field. The user clarified that incident-specific FCTAF and applicable ordinary CTAFs are needed concurrently.

For a CTAF / blind-broadcast script, a frequency may be prefilled only from an approved, current data source; otherwise the user must enter or select it explicitly. The frequency type, applicable area, and source shall remain visible with the script. FCTAF and CTAF entries shall never overwrite or silently substitute for one another.

Nearest-aerodrome selection alone shall not certify a frequency as applicable. Frequency selection and any map-to-script bearing reference must follow the approved operational procedure, with user verification before use.

The QRG says to use callsign “Uncrewed RPA” and report the aircraft's location, not the pilot's physical location. Radio-script templates shall preserve that distinction. The supplied CTAF example also specifies a broadcast 15 minutes prior and at intervals; this timing is content to verify with the operational approver before it becomes an app reminder.

Map-to-script transfer shall use an explicitly confirmed aircraft position. Device GPS is normally the operator/device position and shall not silently stand in for the aircraft. The script's “from aerodrome/landmark” direction shall be calculated from that reference toward the confirmed aircraft position, not the opposite “to aerodrome” bearing.

**Dependencies:** verified scripts, approved location formatting, callsign conventions, radio-frequency data/source, and review owner.

### FR-05a — FCTAF and location-aware frequency panel (P1)

The Communications section shall contain distinct frequency groups:

1. **NSW statewide default FCTAF:** bundle a versioned offline reference for 132.55 MHz, as published in the NSW RFS Fire CTAF Allocation OPG dated 5 November 2026. Preserve its stated scope: NSW emergency-response aerial firefighting/intelligence operations, in the absence of a provided FCTAF, and not routine administrative/non-incident communication. Do not apply this NSW default to other jurisdictions without approved supporting procedure.
2. **Incident/sector-assigned FCTAF:** support one or more received assignments with incident name, sector or operating area, assigned frequency, source/assigning authority, verified time, and any supplied validity or boundary information. The RFS OPG reserves FCTAF allocation/change to the State Air Desk (SAD). The app records and displays received assignments; it does not allocate frequencies. Preserve prior assignments and clearly flag changes for verification. Never infer an incident FCTAF solely from GPS, a nearby incident pin, or a public incident feed.
3. **Applicable aerodrome CTAFs:** use the selected GPS or map location to list all matching aerodrome CTAFs according to approved published applicability data, not just the closest aerodrome's frequency.
4. **Applicable airspace / CTAF broadcast-area frequencies:** include published geographic CTAF/broadcast areas and their boundaries, conditions, and frequency assignments. These are a separate lookup from aerodrome point records.
5. **Other relevant frequencies:** where supported by approved data, show Area/FIA/ATC/tower frequencies with their actual service type. Do not call every airspace frequency a CTAF.

The 132.55 MHz statewide reference, RFS FCTAF assignments, and RFS-specific scripts belong to the initial NSW RFS content pack. They are not global defaults in the reusable app. The frequency resolver must use the selected pack's jurisdiction/applicability rules and show “unknown / confirm” when no approved pack covers the selected location/context.

The statewide default shall remain identifiable as a default reference, not be displayed as an incident-specific assignment. If an incident assignment has been recorded, preserve both pieces of information with distinct labels and the correct operational context. Do not prescribe radio tuning/monitoring priorities beyond the approved procedure and confirmed assignment. The RFS Fire Response Airspace Matrix says FCTAF use is additional to the applicable Airservices-designated frequency and describes controlled-airspace communication separately.

The location lookup shall accept device GPS or a manually tapped location/operating area. Where published applicability depends on altitude, date/time, service hours, or airspace status, use those inputs and show their reference units/datum. If required inputs or current status are unknown, identify the result as a candidate requiring confirmation rather than silently including or excluding it as definitive.

Each result shall show the frequency in MHz, service/type, named aerodrome or area, reason it matches, source/publication, effective period or issue date, and relevant conditions. Show every overlapping published match in the installed dataset. Identical numeric frequencies may be grouped only if every associated aerodrome/area and its conditions remain visible.

Map layers shall distinguish aerodrome markers from published broadcast/airspace areas and incident FCTAF boundaries when an approved boundary has been supplied. A proximity radius, including the QRG's 3 NM or 5.5 km reference, shall not be used as a substitute for published frequency applicability.

All installed data and the statewide FCTAF reference shall be available offline. Display dataset coverage, issue date, and refresh/verification state. “No matching data” must not imply “no applicable frequency.” Do not claim complete location-based CTAF coverage until geographic/vertical/temporal coverage, licensing, and update delivery have been validated. ERSA/VTC and applicable NOTAM changes must be accounted for in the source/update plan.

**Dependencies:** approved radio procedures and RPAS applicability review; official aerodrome-frequency data; published airspace/broadcast-area definitions; altitude/service-hour conditions; data licensing and offline redistribution rights; incident FCTAF assignment source and change-verification process.

### FR-06 — Field Mode and status display (P1)

The app shall provide a high-contrast field display with large touch targets. Persistent status shall distinguish at minimum: network state, GPS state/accuracy if available, map availability, and any pending local actions. Color shall not be the only status cue.

**Dependencies:** target-device testing and accessibility review.

### FR-07 — Offline map and pin (P1, contingent on proof-of-concept)

The app shall render a legally usable, locally available map package offline. The user shall be able to view current location when GPS is available and manually drop or move a pin. The screen shall distinguish GPS-derived position from manually selected position.

**Dependencies:** MapLibre/native compatibility with the selected Expo build, offline tile/package format, data licensing, device storage limits, and map update process.

### FR-08 — Saved Watch Areas (P2)

Users shall be able to save a map center, zoom, and supported visible layers as a named Watch Area, then restore that view. Watch Areas shall be local to the device unless a separately approved sharing feature is added.

This adopts the useful operational pattern of saved map views and selectable layers seen in AlertifyAU, without assuming a data integration or copying its branding. Reference: https://alertify.au

**Dependencies:** map layers and storage model; agreement on whether Watch Areas can be exported or shared.

### FR-09 — Map layers and user markers (P2)

The map shall allow supported layers to be turned on/off and shall distinguish user-added markers from source-provided data. Each external layer shall display its source and data timestamp where available. Unavailable or stale layers shall be visibly indicated.

**Dependencies:** approved data sources, licensing, layer formats, and freshness thresholds.

### FR-10 — Radius tool and spatial export (P2)

Users shall be able to choose an approved radius and center it on current GPS or a manual pin. The app shall export selected geometry, center coordinates, and user-selected markers to KML or KMZ through the device's file/share mechanism.

The proposed 500 m–20 km range from the initial brief is not approved until operational owners confirm it.

**Dependencies:** agreed units, geometry behavior, export format, coordinate reference system, and tests in target mapping software.

### FR-11 — Distance, direction, and unit conversion (P1)

The user shall be able to choose the measurement origin as either the current GPS position or a point tapped on the map. The app shall distinguish a GPS-derived position from a manually placed point and show GPS accuracy when available.

From the selected origin, the app shall show the nearest aerodrome and nearest locality from an approved offline dataset. The aerodrome result shall state whether the source classifies it as controlled or uncontrolled; the user shall be able to filter for the nearest controlled or nearest uncontrolled aerodrome. The user shall also be able to measure from the selected origin to a second point tapped on the map.

Each measurement shall show distance in kilometres and nautical miles, plus initial bearing relative to true north in degrees and a cardinal/intercardinal direction label. Clearly label bearing direction: “to reference” is from the selected origin toward the aerodrome/locality; “position from reference” is from the reference toward the selected point. Recompute each initial bearing for its direction rather than passing a mislabeled reverse bearing into radio scripts. A locality result shall be identified as the dataset's locality reference point, not represented as a boundary or exact address.

Position provenance shall be visible: device GPS, manually selected point, or explicitly confirmed aircraft position. The supplied SOP's airspace-calculator descriptions on pages 12 and 47–48 explicitly cover nearby aerodrome bearings/distances and radio-frequency information; the new app shall keep this capability independent of AVCRM.

The app shall include a kilometres-to-nautical-miles converter using 1 NM = 1.852 km. Calculations shall use full precision internally; displayed precision shall not imply more accuracy than the source coordinates or GPS fix support. The app shall identify the source, version/date, and location accuracy where available. Missing or stale reference data shall be clearly indicated.

**Dependencies:** approved aerodrome and locality datasets, controlled/uncontrolled classification source, coordinate reference system, data licensing, offline packaging, and mapping proof-of-concept.

### FR-11a — Proximity advisories (P2)

Where validated aerodrome, HLS, or airspace data and approved rules are available, the app may present advisory proximity warnings. Any threshold from the initial brief must be approved by the responsible operational stakeholders against current authoritative material before implementation. A missing warning or a position outside a displayed distance shall never be represented as permission to fly.

### FR-12 — Weather dashboard (P2)

Users shall be able to enter weather observations or values manually and identify them as manual. Optional cached weather shall show provider, location, retrieval time, and age. Any threshold comparison shall use an approved aircraft-specific configuration and show the source/version of that configuration.

Received weather products shall additionally show issue/observation time and validity where supplied. Download time alone is not evidence of a new observation. See FR-19 for received briefing products and FR-20 for cameras.

**Dependencies:** approved aircraft profiles and limits, weather sources, stale-data rules, and stakeholder sign-off.

### FR-13 — NOTAM explanation (P2, advisory only)

Users shall be able to enter or paste NOTAM text and receive a plain-language explanation for supported patterns. The original text shall remain available. The result shall identify unsupported or uncertain sections and shall not claim complete coverage or clearance. Geo-intersection warnings are excluded until data and parsing have been validated.

Explanation and extraction shall use reviewed deterministic on-device logic, not a Replit or other paid hosted AI callback. Preserve replacement/cancellation relationships and effective periods where supported; unsupported syntax shall not be guessed. Importing a document or pasting content does not waive the source's permitted-use conditions.

**Dependencies:** representative test corpus, authoritative reference process, supported syntax list, and independent safety review.

### FR-14 — Incident feed and notifications (P2)

When connected, the app may refresh an approved incident feed and cache permitted data. Each incident shall show source and last-updated time. Local notifications may be based only on information already received by the device. The interface shall explain that offline or closed-app alerts may be unavailable or stale.

**Dependencies:** approved feed/API, licensing and terms, update interval, caching rules, and notification permission behavior. Guaranteed remote push is not in scope without an approved push provider/service.

### FR-15 — Equipment movement submission (P2/P3)

The app may provide a pre-populated equipment movement form and submit it to an approved Microsoft Forms/SharePoint endpoint if supported. Offline users shall be able to save a draft locally. Submission shall have explicit pending, success, and failure states; retries shall not create duplicate submissions where the endpoint allows idempotency.

**Dependencies:** endpoint owner approval, supported authentication, data classification, privacy review, and duplicate-handling behavior.

### FR-16 — AVCRM link (P3, stretch goal)

No AVCRM work is required for MVP. A feasibility spike may occur only after the vendor confirms supported customer API access, available read/write operations, mobile authentication, sandbox/testing access, and any additional charges. If no supported secure direct client flow exists, defer the feature rather than embedding service credentials or relying on undocumented endpoints.

**Dependencies:** vendor response and operational decision on which AVCRM data should be read or written.

### FR-17 — In-app Data & Downloads manager (P1)

The app shall provide a common manager for permitted source products, including but not limited to Airservices AIP-related publications, frequency/airspace datasets, received NAIPS briefing products, and weather-camera snapshots. It shall support direct authorized downloads and import of files the user/agency has the right to store and process. Manual import is not a licensing workaround.

The product catalogue shall show installed/available items, coverage, source, issue/effective dates, last successful update check, download size where known, storage use, and access/permission status. Users shall be able to select relevant regions, aerodromes, publications, and mission packs rather than being forced to download all of Australia.

The installation pipeline shall:

1. Check the source's configured access and permitted-use conditions before making a request; do not silently substitute website scraping for an unavailable authorized feed.
2. Download over HTTPS directly from an approved provider or an explicitly approved agency distribution endpoint, with progress, cancel/retry, Wi-Fi preference, bounded retries, provider rate limits, and resumable transfers where supported.
3. Stage the download separately from installed data, check available storage and file integrity, and verify publisher/agency signatures where provided. A locally calculated hash alone does not prove publisher authenticity.
4. Parse/index on-device using versioned, deterministic source adapters. Prefer authorized structured data over PDF-derived operational values. Preserve the unmodified source alongside derived records and record parser version and source page/record provenance.
5. Validate schemas, units, coordinates/datum, geometry, identifiers, numeric frequencies, source cycles, altitude references, validity periods, and relationships between files. Quarantine malformed, unsupported, or inconsistent data rather than creating guessed operational records.
6. Install a compatible dataset transactionally. Interrupted download, parsing failure, or low storage shall leave the last valid installed package intact and never mix incompatible data cycles.
7. Separate future-effective, currently effective, superseded, expired, stale, and never-verified states. Do not activate a future issue early or label a successful HTTP response as proof of currency.
8. Record an update log and allow recovery to a retained valid package where the source licence permits retention. A recovered older package shall retain its superseded/stale status, not be relabeled current.

Downloaded packs shall contain licensed documents and validated reference/data records only—not executable code, scripts, plug-ins, or modules that add/alter app features. Changes to parsers, executable logic, or features shall ship through the signed app release channel, not the data updater.

Use durable application storage for installed packs, not only an OS-purgeable image/web cache. Keep originals and indexes in app-controlled files and SQLite, including local full-text and spatial lookup indexes as supported by the validated native stack. Treat imported files as untrusted input: enforce size limits, safe archive paths, and decompression limits.

Manual foreground “Check for updates” and “Update selected” shall be available. Optional scheduled checks shall respect user settings, OS background limits, and provider conditions; the app shall not promise background refresh when closed. Updates shall not require Replit, an always-on backend, or a mandatory per-launch internet check.

Each mission shall retain the versions/snapshot references used. Do not silently change its baseline during use. Newly received safety-relevant changes must still be visibly surfaced for review; baseline version pinning must not suppress change notices or imply that the older snapshot remains current.

**Dependencies:** source-specific permissions and supported interfaces; target-device parsing/storage performance; manifest/schema tests; source-specific freshness policy; migration and recovery testing.

### FR-18 — Offline AIP and associated publications (P1 framework; content rights-gated)

Support a catalogue for the AIP Book, ERSA/RDS, DAH, DAP, AIP SUP/AIC, amendments, and relevant charts, where licensed. Preserve source documents and notices unaltered for offline viewing/search, with edition/effective date and source references. Linking to a website alone does not meet the desired offline capability.

Use authorized complete editions or structured products where available. Apply a page amendment only to its matching base edition, only if that transformation is permitted and validated; otherwise retain the amendment distinctly and obtain the correct complete edition. Do not silently create a hybrid document or claim a partial download is a complete publication.

AIP/DAH/ERSA extraction for frequency or map tools shall be separately validated and traceable to the original. A readable PDF does not itself establish that every operational value was parsed correctly.

The public AIS page permits limited unaltered personal non-commercial screen viewing and explicitly excludes internal business purposes from personal use; proposed storage, retrieval, adaptation, and redistribution require an applicable permission/licence. Public accessibility is not the licence for this operational app. Content adapters remain disabled until the permitted use has been confirmed.

### FR-19 — Received NAIPS briefing data (P2; authorization-gated)

The first NAIPS scope is read-only receipt and offline viewing of authorized briefing products, not recreating the entire service. Store received products such as applicable meteorological information, NOTAMs, charts, and briefing updates, according to granted rights. Show the request's location/area/time parameters, briefing reference where supplied, receipt time, source issue times, validity, and update status. Keep the source response and distinguish updates, replacements, and cancellations.

Offline operation can reopen a received briefing; it cannot request a new official briefing, receive a new NOTAM, or establish that no change has occurred. Expired/stale information must remain clearly identified wherever displayed, including mission packs and map panels.

Airservices publishes a Flight Briefing Data product using a separate SOAP web service and interface documentation. Use that or another expressly authorized interface, not automated login/scraping of the public NAIPS website. The public NAIPS acceptable-use conditions prohibit unauthorized automated access and specified reuse. A free personal account does not grant app-integration or redistribution rights.

Any permitted individual account credential belongs in OS-protected secure storage, never a bundled publisher/service secret. If the supported interface requires a confidential server-side credential or a gateway, do not ship that secret in the mobile app or add a Replit proxy. Keep the adapter unavailable unless an explicitly approved non-Replit agency integration resolves the requirement and its costs. Flight-plan notification/submission is not included merely because the read-only briefing interface is supported.

FR-21 defines the end-user credential vault. Source-product archives shall exclude authorization headers, passwords, bearer tokens, and session cookies; preserving a briefing's original content does not mean archiving its secret transport/session material.

### FR-20 — Weather-camera catalogue and snapshots (P2; rights-gated)

Provide a camera/location catalogue and permitted latest-image retrieval, with favourites or mission selections where useful. Retain approved snapshots for offline viewing only within the source's permitted retention/use. A camera's capture timestamp, download time, location, and view direction where supplied shall remain visible; display UTC with a clearly labelled local-time option.

Saved images shall be labelled “snapshot,” not “live.” Missing capture time shall be “capture time unknown.” Re-downloading an identical image or receiving HTTP 200 shall not reset its apparent capture age. Show unavailable/stale states and never synthesize a current image or infer validated aviation weather from a photograph.

The Airservices camera site says its imagery is supplied by the Bureau of Meteorology for aviation purposes, is not a regulated service, does not replace official forecasts/observations, and should not be relied on to be available/up to date for flight-planning or in-flight decisions. Preserve those qualifications. Automated retrieval, retention, redistribution, and the role of any third-party image rights remain to be confirmed; public viewing is not proof of an unrestricted camera API.

### FR-21 — Device-only Accounts & Security vault (P1 framework; connections gated)

Provide a native Accounts & Security screen with separate provider profiles for supported NAIPS, CASA/myCASA, and licensed Airservices data access. Show only applicable connection methods. There is no assumed universal “AIP login”: public publications, licensed data subscriptions, NAIPS accounts, and CASA accounts are distinct. Do not create a credential requirement where the supported source is public.

The vault shall:

- Store permitted credentials and session/refresh tokens only on the user's device using iOS Keychain and Android Keystore-backed encrypted storage. Use a reviewed native secure-store implementation, not plaintext SQLite, ordinary unencrypted preferences, an app source-code key, or custom cryptography.
- Prefer scoped/revocable tokens obtained through an officially supported authorization flow. Where a provider supports it, use authorization-code/PKCE with the system authentication browser. Do not assume any named provider offers OAuth or a third-party API merely because its website has a login.
- Keep government Digital ID/myID authentication in the official provider flow. Never collect or store myID credentials or intercept MFA challenges. CASA's public account guidance describes Digital ID and username/password options, but no supported third-party app authorization interface has been verified here.
- Store a provider password only if that provider expressly supports the intended app sign-in/access model and the user elects to save it. Otherwise use the official login route without saving the password, or keep the adapter unavailable. A browser login alone does not give the app a reusable token or scraping permission.
- Require supported OS-enforced biometric/device-credential verification to unlock saved secrets for authorized foreground use. Validate the policy on real devices; an app PIN screen is not a substitute for OS-enforced key access. If required protection is unavailable, fail closed or offer do-not-save operation rather than plaintext fallback.
- Use device-only, non-synchronizing/non-migrating Keychain accessibility on iOS, requiring a device passcode. Exclude Android secret material from cloud backup and device-transfer rules, use non-exportable platform key protection, and verify actual hardware-backed security rather than assuming StrongBox on every device.
- Store no secret, decryption key, or encrypted credential backup on developer, Replit, analytics, support, or other app-operated servers. Provide no developer/admin decrypt, impersonation, recovery, secret-export, or remote-inspection function. The provider's own password/account recovery remains separate.
- Keep secrets out of logs, crash reports, request URLs, source archives, local search indexes, mission exports, and clipboard features. Do not display saved secrets by default. Apply sensitive-screen/app-switcher protections where the OS supports them; do not claim every platform can prevent screenshots.
- Release secrets only to the corresponding verified provider authentication endpoint over valid HTTPS. Do not forward them to arbitrary configurable download URLs, cross-provider redirects, a developer proxy, or a content-pack/parser endpoint. Enforce provider/endpoint separation.
- Minimize decrypted lifetime and avoid persistent decrypted copies. Lock the vault when the app backgrounds or its short-lived authorized session ends. Do not promise perfect memory erasure in a managed runtime.

The screen shall separate **vault locked/unlocked**, **signed in/session expired**, **content entitlement**, and **app download/storage authorization**. A successful login shall not automatically enable restricted automation or paid access. Users shall be able to disconnect, delete locally saved secrets, and follow the provider's supported revocation/logout route. App-side deletion is not a guarantee that a provider-owned browser session has been logged out.

Handle cancellation, biometric enrollment changes, passcode removal, invalidated keys, and device migration by requiring reauthentication, not by silently weakening encryption. Credential recovery by the developer is intentionally unavailable. Do not rely on uninstall to erase iOS Keychain items: implement explicit deletion and a reviewed fresh-install/reinstall policy that prevents stale credentials unexpectedly resurfacing.

Saved-secret access requiring user presence may prevent unattended/background refresh while locked. Show “unlock/re-authentication required” and retain installed permitted reference data; do not disable user-presence protection merely to achieve scheduled updates. Sensitive provider documents/briefings need their own at-rest/access/backup policy, separate from the credentials vault; public QRG/reference access need not be blocked whenever the account vault is locked.

**Security assurance boundary:** the intended guarantee is no developer-access or recovery mechanism and no server-held secret/key, not immunity to a compromised device, exploited app process, or malicious replacement build. When password authentication is used, the client must be able to use that password transiently and the intended provider receives it. Encryption at rest is not a promise that an app capable of authenticating can never access a credential at runtime. Release integrity, dependency review, restricted data flows, and real-device testing are required.

**Dependencies:** provider-supported authentication and app-use permission; secure-store access-control configuration; real-device key protection/backup testing; MFA/session lifecycle; logout/revocation support; release-build security verification. No live credentials are needed in chat or in the planning documents.

### FR-22 — Multi-operator distribution and separation (P1)

The design shall support distribution to other operators while retaining local-first behavior and zero Replit runtime calls. For the first release, assume one operator context per installation on an operator-controlled device. Shared devices, multiple local operator profiles, remote management, team synchronization, and central role-based administration are not implied by this requirement; shared-device use requires a separately validated isolation/handover design before being supported.

Each installation shall create its own vault/key context, provider sessions, mission records, checklist progress, and saved locations. Do not ship the developer's, requester's, another operator's, or a generic shared provider login. One operator's entitlement shall not be treated as a licence for other operators or installations.

Onboarding shall explain offline pack installation, data coverage/freshness, local-only storage, vault/recovery limits, and source-specific access conditions. Users shall be able to see app, content-pack, parser, and source versions without exposing secrets. Local identity labels must not be presented as verified agency identities or approval credentials.

Document licences and approvals must cover the intended audience, device/user counts, app distribution, local extraction/storage, updates, permitted exports, and any onward redistribution. Reference-pack import/export and mission export are distinct: a share action for operational notes shall never include credentials, sessions, personal provider documents, or restricted licensed packs by default. Export requires explicit selection/confirmation and source/privacy permission.

For pilot distribution, define target OS/devices, signed-build distribution method, release notes, content owner, support contact, and withdrawal/update procedure before delivery. Do not represent the app as officially endorsed by RFS or distribute agency branding/content without the relevant permission. App-store, signing, distribution, or supplier fees must be separately disclosed and approved; none may silently introduce a paid Replit runtime service.

Support diagnostics shall be local and sanitized by default: app/package/parser versions and non-secret status codes, not credentials, mission content, or precise locations. Any optional diagnostic export must be previewed and explicitly initiated by the user. There is no developer remote vault-inspection or recovery route.

Loss of a device shall not compromise other operators' app accounts because there are no shared app credentials. Explain the limits: this no-backend design does not provide app-operated remote wipe or instant offline revocation. Provider account revocation and any existing agency device-management mechanisms remain separate.

**Dependencies:** operational/content distribution approval, licences for the intended multi-operator audience, supported-device matrix, privacy/retention/export policy, and a signed-build pilot distribution decision.

### FR-23 — iOS-first iPhone/iPad responsive support (P1)

The first release shall support both iPhone and iPad across the approved minimum iOS version matrix. Core screens and workflows shall support portrait and landscape without clipping, hidden actions, lost edits, or forcing the user to rotate to a single orientation. When orientation or window size changes, preserve navigation, unsaved text, mission/checklist state, and selected map/measurement data.

Layouts shall adapt to the available size class/window width rather than relying only on a single phone layout scaled up for iPad. Support iPad multitasking/resizable window configurations declared for the release, safe areas, keyboard appearance, and user text/display-size settings. Specify exact model/OS support in the app and release/support documentation. Android is not in the first release; it requires a later platform-specific build and validation gate.

**Dependencies:** iOS device/OS support matrix, design/system layout rules, physical-device testing, accessibility review, and App Store device compatibility metadata.

### FR-24 — App Store compliance and product disclosures (P0 release gate)

For an App Store release, maintain a submission checklist against the **current** Apple App Store Review Guidelines, applicable App Store Connect requirements, and Apple Human Interface Guidelines at each submission. Include current privacy disclosures, support/privacy links, accurate metadata/screenshots, licensing/content rights, SDK/privacy-manifest and required-reason API checks where applicable, on-device tests, and reviewer instructions/demo mode for account-gated features. Provide a functional way for reviewers to see the app without asking them to use a real operator's credential or access restricted services.

In-app About/Help and the supporting user/privacy/release documentation shall agree on:

- First-release platform and scope: iPhone and iPad; supported iOS range; portrait and landscape; Android is planned later and is not supported until separately released. The initial operational pack is focused on NSW RFS; other agencies/jurisdictions are supported only as separately authorized later content packs.
- The offline-first behavior and what is stored on-device versus sent to each explicitly enabled provider.
- The device-only credential vault, OS authentication, absence of a developer recovery/server copy, and the limits of that guarantee.
- Agency/jurisdiction pack identity, content issuer/version, source rights and coverage, verification/approval state, and update time; user-imported content is not automatically vetted or distributable. Cached NAIPS, weather, camera, or map content may be stale or unavailable without connectivity.
- The app's advisory-only role; it is not a flight approval/clearance tool, an aviation authority, or evidence that an operation is safe or authorized.
- Operator support/contact, privacy policy, distribution status, and any RFS/agency endorsement only where explicitly approved.

Keep public App Store listing, App Review notes, in-app disclosures, privacy policy, onboarding/help, and operator support documentation consistent. Do not state that Apple has approved the app until Apple does so. The project requirement is to design and verify against applicable rules; review outcomes and future rule changes remain controlled by Apple.

**Dependencies:** named App Store account/submitter, support contact and privacy-policy destination, current Apple rules at submission, accurate data-practice inventory including third-party SDKs, reviewer demo mode, distribution/content permissions, and App Store review.

### FR-25 — Agency-neutral content packs and local import (P2 follow-on)

The app shell and data model shall separate reusable RPAS features from agency-specific manuals, rules, policies, checklists, contacts, frequencies, and jurisdictional reference data. The RFS/NSW-focused pack is the initial operational scope; adding other agencies is a later release, not an MVP claim.

The follow-on importer shall let an operator add eligible files from device storage for their own permitted use and, for supported formats, organize the material into a locally stored content pack. It shall retain the original source and expose a clear manifest with issuer/agency, jurisdiction, title and type, edition/version, source and page/section provenance, effective/expiry dates, geographic scope, declared use/distribution rights, import time, parser/schema version, and the named verification/approval status.

Import must not imply that the user is a member of the named agency, that the source is current, or that the content is authorized, correct, or operationally approved. Label user-provided material “unverified” unless a documented review establishes otherwise. Keep unsupported/unstructured manuals available as attributed offline reading/search; do not turn their text into an operational threshold or rule unless a reviewed parser and responsible content owner approve the derived content.

Where multiple packs are installed, show the selected agency/jurisdiction context prominently. A mission/checklist/radio-frequency result shall remain tied to that context, and the app shall not silently merge or substitute rules across packs. Unknown or mismatched context must produce a confirmation/unknown state, never a plausible but unverified default. A selected pack or locally typed organization name is not proof of identity, authority, or affiliation.

Imported packs shall contain only documents and validated data records, never executable code, plug-ins, or scripts. Local import is not a permission or licensing workaround; a user's right to view a file does not automatically permit app parsing, persistent storage, distribution to other operators, or republishing it. No backend or Replit service is required for import, parsing, approval metadata, or pack selection.

**Dependencies:** reviewed generic pack schema; safe local file import; permissions for the intended use/audience; source-provenance and approval workflow; tested jurisdiction/profile isolation; and acceptance of follow-on priority. No new third-party content is assumed to be licensed.

## 8. Cross-cutting non-functional requirements

### Offline behavior

- The MVP's core documents, checklists, mission notes, and downloaded maps must remain usable without network access.
- Every feature that requires network access must be labeled as such and fail without destroying local work.
- The app must display the last refresh time for cached external information.
- Installed publications, indexes, frequency/airspace packs, permitted camera snapshots, and received briefings shall remain available offline with their original dates and validity/freshness labels.

### Zero-Replit runtime and cost control

- The installed app shall make no request to Replit-owned runtime services, including indirect SDK callbacks, connector proxies, telemetry, authentication, hosted AI, hosted data, app licence checks, and update services.
- Core storage, search, parsing, calculations, maps, and mission workflows shall run locally. Use a compiled native Expo/React Native app with a local database and local assets, not a Replit-hosted web wrapper.
- Map styles, fonts, glyphs, sprites, scripts, and other supporting assets required offline shall also be bundled or installed locally under their licences; a downloaded map shall not conceal an online asset dependency.
- Provider updates shall contact only approved destinations. Show a source/connection inventory, do not transmit location or mission parameters unless the user-approved request requires it, and do not enable optional analytics/crash reporting by default.
- No mandatory paid API/AI/hosting service shall be enabled. Prefer no-fee, legally reusable data. Any data licence, provider subscription, agency gateway, or other charge requires explicit approval and remains separate from the zero-Replit-runtime requirement.
- Zero Replit runtime/service spend is an architecture requirement, not a promise that development/build tools, app-store distribution, devices, connectivity, or third-party data are free.

### Data integrity and privacy

- Store core operational records on-device by default.
- Define device-loss, backup/export, retention, and deletion behavior before pilot.
- Do not embed long-lived service credentials in the app.
- End-user provider credentials/tokens shall follow FR-21, with device-only encrypted storage, no developer recovery path, and no credentials in diagnostics or exports.
- Do not transmit mission or location data unless the user and operational owner have approved the destination and behavior.

### Reliability and recovery

- Interrupted operations must leave the user with a clear recoverable state.
- Local writes shall be tested across app restart and device reboot.
- Failed network requests shall preserve drafts and show actionable status.

### Field usability

- Test in sunlight, low-light conditions, with gloves, and on target devices.
- Use large touch targets and clear text; do not rely on color alone.
- Show GPS accuracy/uncertainty where available and distinguish pin selection from live GPS.
- On the iOS first release, test iPhone/iPad portrait and landscape, iPad available window sizes/multitasking configurations, keyboard/display-size changes, and state preservation through every rotation/resizing transition.

### Apple platform and App Store readiness

- Base support statements on the tested iOS device matrix; do not claim unsupported Android compatibility.
- Use current Apple requirements at submission time; keep a versioned compliance checklist and evidence for App Store Connect privacy details, SDK manifests/API reason declarations where applicable, support/privacy URLs, reviewer access/demo mode, release metadata, licensing, and physical-device testing.
- State tested compatibility and privacy behavior consistently in the app, App Store metadata, support materials, and privacy policy.
- Do not present App Store approval as guaranteed. Apple review/approval is an external decision.

### Safety assurance

- Each rule, threshold, script, and reference must have an owner, source, and review date before operational release.
- Changes to safety-related content require review and versioning.
- The app shall communicate that calculations and data layers are decision support, not operational approval.

## 9. Dependencies and decision gates

1. **Operational content:** obtain current approved SOPs, checklists, radio scripts, contacts, aircraft limits, and named content owners.
2. **Mapping proof-of-concept:** test the Expo/native mapping path, offline package size, licensing, GPS behavior, and target-device performance.
3. **Data-source approvals:** identify sources, licenses, expected update cadence, and stale-data thresholds for every external layer.
4. **Distance and frequency reference data:** confirm an approved offline aerodrome dataset with controlled/uncontrolled classification, a locality gazetteer, aerodrome CTAFs, and published airspace/CTAF broadcast-area geometry and frequency conditions. Do not assume a landing-site point CSV provides complete broadcast-area coverage. Resolve licensing, offline redistribution, update delivery, and coverage validation before promising all applicable CTAFs.
5. **Data governance:** decide local retention, export/backup, device-loss response, and which records may leave the device.
6. **Integration security:** confirm supported authentication and whether a no-backend mobile client is possible for each external service.
7. **Operational sign-off:** designate who approves safety content and pilot readiness.
8. **Airservices access:** the user confirmed no existing agency agreement. Establish permission for local storage/parsing/updating and the supported interface independently of end-user login credentials. Public website access or successful personal authentication alone is insufficient.
9. **Zero-Replit verification:** audit dependencies and release-build network traffic, including indirect SDK, map-style/font, update, and telemetry requests.
10. **Provider accounts:** verify each provider's supported mobile authorization model and distinguish credential storage, authentication, entitlement, and automation rights. Device-only vault feasibility does not establish a working NAIPS/CASA/AIP connector.
11. **iOS/App Store release:** select the minimum supported iOS version and device matrix; prepare current Apple-compliance evidence, privacy and support materials, App Review access/demo mode, accurate disclosures, and a review-ready iPhone/iPad portrait/landscape build. Apple approval is not guaranteed.
12. **Android follow-on:** do not scope Android into the initial release. Re-plan native secure-storage, layout/orientation, data, and privacy testing after the iOS pilot gate.

## 10. Acceptance test scenarios

### AT-01 — Core offline startup

**Given** the user has installed approved documents and a map package, **when** the device is in airplane mode and the app starts, **then** the document vault, checklist, mission notes, and local map package remain accessible and the app clearly indicates offline state.

### AT-02 — Offline checklist persistence

**Given** a checklist is in progress, **when** the user records item states, closes the app, and reopens it offline, **then** the saved progress is restored with the checklist version visible.

### AT-03 — Document version visibility

**Given** an installed document has a version/effective date, **when** the user opens it offline, **then** that version/date is visible. When an online update check is unavailable, the app does not imply the installed copy is current.

### AT-04 — GPS unavailable and manual pin

**Given** GPS is unavailable or has poor accuracy, **when** the user opens the map, **then** the app shows the GPS status and allows a manual pin if supported. It must not label a manual pin as current GPS position.

### AT-05 — Saved Watch Area restore

**Given** the user saves a named area with a map center, zoom, and supported layers, **when** they reopen it offline, **then** the saved view is restored and any unavailable layer is identified.

### AT-06 — Stale incident/weather data

**Given** cached external data has exceeded its configured freshness threshold, **when** the user views it offline, **then** the data remains labeled with its source and age and is visibly marked stale.

### AT-07 — Unverified safety threshold

**Given** a proposed threshold has no approved source/version, **when** an administrator configures the app, **then** it cannot be presented as an approved operational rule or a definitive go/no-go result.

### AT-08 — Radius export

**Given** a center and approved radius are selected, **when** the user exports KML/KMZ, **then** the exported file opens in a compatible viewer and contains the center and requested geometry. The export workflow works without internet access.

### AT-09 — NOTAM uncertainty

**Given** a NOTAM contains unsupported or ambiguous text, **when** the user requests an explanation, **then** the original text remains visible and the uncertain section is explicitly flagged rather than silently omitted or confidently misinterpreted.

### AT-10 — Failed form submission

**Given** an equipment form draft exists, **when** submission fails or connectivity drops, **then** the draft is retained and the app shows a failed/pending state. A retry does not silently create a second submission where duplicate protection is supported.

### AT-11 — Local record persistence

**Given** a mission note has been saved, **when** the app is terminated and the device restarted, **then** the note remains available locally according to the agreed retention policy.

### AT-12 — No implied flight clearance

**Given** the app has no warning for a selected location, **when** the user views the map or advisory panel, **then** the interface does not state or imply that the operation is authorized or safe solely because no warning is displayed.

### AT-13 — GPS-to-nearest aerodrome and locality

**Given** GPS is available and the approved offline aerodrome/locality dataset is installed, **when** the user requests nearby references, **then** the app shows the nearest aerodrome with its controlled/uncontrolled classification and the nearest locality, each with distance in km and NM and bearing in degrees plus a direction label. GPS accuracy and dataset source/version are visible.

### AT-14 — Tapped-origin and point-to-point measure

**Given** GPS is unavailable or the user chooses a manual origin, **when** they tap an origin and then a destination on the map, **then** the app measures between those two points and labels both as manually selected. It does not silently substitute the device location.

### AT-15 — Kilometres-to-nautical-miles conversion

**Given** the user enters a distance in kilometres, **when** the converter runs, **then** the displayed NM value uses 1 NM = 1.852 km, retains full precision internally, and follows the stated display rounding. A test value of 1.852 km shall convert to 1 NM before display rounding.

### AT-16 — Missing, stale, or uncertain reference data

**Given** aerodrome/locality coordinates are missing, stale, or cannot be classified, **when** the user requests a measurement, **then** the app identifies the missing/stale/unknown data and does not invent a nearest result or imply operational clearance.

### AT-17 — Dedicated QRG tab offline

**Given** the app has the QRG content installed, **when** the user opens Quick Reference from the main navigation in airplane mode, **then** both “Fly & Navigate” and “Communicate & Administrate” are available without entering the document library. Source/version status is visible, and a CTAF-script link opens the matching Communications section.

### AT-18 — CTAF frequency entry and source

**Given** the user opens the CTAF / blind-broadcast section, **when** they select a sourced frequency or enter one manually, **then** the frequency remains visible alongside the script and is saved with the local mission context. If no verified frequency is available, the app leaves the field unset rather than guessing.

### AT-19 — Correct aircraft position and bearing direction

**Given** the device and aircraft are at different locations, **when** the user transfers a map measurement into the radio script, **then** the user must confirm the aircraft position and the script describes that position from the selected aerodrome/landmark. For a test aircraft due east of a reference, the script shall describe the aircraft as east of that reference, not west. Device GPS shall not silently replace the aircraft point.

### AT-20 — Separate checklist stages and aircraft variants

**Given** approved aircraft-specific checklists are installed, **when** the user chooses an aircraft and starts checks, **then** pre-flight, pre-start, and post-flight stages remain distinct and show their source/version. Progress saved for one aircraft/stage shall not silently complete another aircraft/stage.

### AT-21 — Separate statewide and incident FCTAF

**Given** the NSW reference is installed and an incident FCTAF has been received from the authorized assignment source, **when** the user records that assignment, **then** the panel shows the incident/sector assignment and the separate NSW default reference of 132.55 MHz, with sources and verification status. Neither shall overwrite an ordinary aerodrome or airspace CTAF. Recording a value shall not be represented as allocating or approving it.

### AT-22 — Multiple applicable aerodrome and airspace CTAFs

**Given** a synthetic test location overlaps two published aerodrome applicability areas and a CTAF broadcast area in the installed test data, **when** the user chooses that point by GPS or map tap with the required altitude/time, **then** all matching CTAF entries and their service/area labels are returned, not only the nearest. Additional Area/FIA/ATC results shall remain separately typed.

### AT-23 — Conditional or incomplete frequency coverage

**Given** altitude/service-hours status is unknown, a published area boundary intersects the location-accuracy range, or the installed dataset is incomplete/stale, **when** the user requests applicable frequencies offline, **then** the app identifies the uncertainty and coverage limits, retains the sourced reference data, and does not represent an empty result as proof that no frequency applies.

### AT-24 — Incident FCTAF change is not ordinary CTAF editing

**Given** an incident has a recorded FCTAF and applicable aerodrome/airspace CTAFs, **when** a received FCTAF change is recorded, **then** the app retains the prior assignment, source and change-verification details and leaves all ordinary CTAFs untouched. Changing position shall not automatically reassign an incident FCTAF.

### AT-25 — Zero Replit runtime traffic

**Given** a signed release build, **when** startup, checklist, map, document search, parsing, authorized data update, and export workflows are exercised with network tracing and Replit destinations blocked, **then** no direct or indirect Replit service requests occur and installed-data workflows still function. Dependency/configuration review shall include auth, updates, telemetry, map supporting assets, and AI SDKs.

### AT-26 — Failed data update preserves installed data

**Given** a valid pack is installed, **when** a download is interrupted, storage is exhausted, an integrity check fails, or parsing fails, **then** that pack remains usable, no mixed-cycle dataset becomes active, and the manager shows a recoverable failure. A supported resumable download may resume without losing the installed version.

### AT-27 — Effective dates and mission baseline

**Given** a future-effective publication and an active mission using an older baseline, **when** the new publication is downloaded, **then** it remains staged until its effective time and the mission retains its recorded source versions. Relevant newly received changes are still surfaced for review, and recovered/superseded data is never relabeled current.

### AT-28 — Received briefing is an offline snapshot

**Given** an authorized NAIPS briefing was received, **when** the app restarts offline, **then** it shows the stored source products, request scope, receipt/issue/validity times and update state. It does not claim to have checked for new NOTAMs or treat a failed refresh as a successful current briefing.

### AT-29 — Camera capture age is not download age

**Given** a camera source returns an old image again, **when** refresh succeeds, **then** the image's original capture age remains visible and it is not marked live/current simply because it downloaded successfully. Offline and missing-timestamp cases are explicit.

### AT-30 — Source permissions and fee gates

**Given** source authorization, a relevant licence, or approval for a charge is missing, **when** the user attempts that source adapter, **then** no restricted automated request or paid service call is made. A manual import must not bypass the permitted-use gate. Other installed no-fee/core features remain available.

### AT-31 — Parsing is local and fail-safe

**Given** an authorized source contains unsupported formatting or an inconsistent frequency/geometry/unit value, **when** it is parsed on-device, **then** the original remains identifiable and readable where valid, the derived data is quarantined from operational calculations, and no hosted AI call or guessed value is substituted.

### AT-32 — Data updates do not require an app release

**Given** a compatible authorized data pack is available, **when** the user installs it through Data & Downloads, **then** its source/version/indexes persist across restart without a new app-binary release, Replit callback, or mandatory cloud login. Airplane mode still permits access to the installed pack.

### AT-33 — Device-only encrypted credential storage

**Given** a permitted provider connection on a real supported device, **when** a test credential/token is saved, **then** it is protected by the configured Keychain/Keystore policy, cannot be found in plaintext databases/preferences/files/exports/diagnostics, and has no server copy or developer-held recovery key. Verify configured device-only/backup behavior and actual Android key security level; do not infer these properties from the library name.

### AT-34 — Vault access requires user presence

**Given** the vault is locked, **when** OS verification is cancelled/fails or the app is backgrounded, **then** saved secrets are not released for new work and an authenticated refresh pauses with an explicit state. Installed public references and other permitted offline features remain usable.

### AT-35 — Provider-only authentication data flow

**Given** a provider profile and an authorized test sign-in, **when** authentication, token refresh, redirects, and download requests are traced, **then** secrets go only to the matching verified authentication endpoint, never to Replit, a developer/analytics endpoint, an arbitrary pack URL, or another provider. Source archives contain content, not secret headers/cookies.

### AT-36 — Deletion, migration, and key invalidation

**Given** test credentials have been saved, **when** disconnect/delete, biometric-key invalidation, device transfer, restore, and uninstall/reinstall cases are exercised on target platforms, **then** no unexpected secret migration/resurrection or plaintext fallback occurs. The app correctly requires sign-in again and does not offer developer recovery.

### AT-37 — Authentication is not download authorization

**Given** a personal account can authenticate but app automation/storage rights or a supported interface are unconfirmed, **when** the user opens the source, **then** sign-in and authorization states remain distinct and restricted downloads remain disabled. CASA, NAIPS, licensed publication accounts, and public AIP access are not treated as interchangeable.

### AT-38 — Official identity flow and background limits

**Given** a provider has an approved external-browser authorization flow, **when** a user signs in, **then** identity/MFA remains with the provider and the app stores only the permitted resulting secret/token. Unsupported flows do not fabricate a connected state. Locked-vault/background-refresh cases never weaken user-presence controls.

### AT-39 — Independent operator installations

**Given** clean installations for two test operators, **when** one saves credentials, mission/checklist progress, and locations, **then** the other installation receives none of that data or authentication state. No shared/provider account or test credential is bundled in the release, and no team backend is required.

### AT-40 — Sanitized exports and support

**Given** an installation contains private missions, provider sessions, and restricted reference packs, **when** a user previews a mission/support export, **then** only the expressly selected permitted data is included, with no credentials, session material, unselected mission/location data, or automatically bundled licensed packs.

### AT-41 — Multi-operator licence and release gate

**Given** a build is proposed for distribution beyond the requester, **when** release readiness is reviewed, **then** the intended audience/devices and source-content distribution rights are documented, missing permissions block affected content, and no agency endorsement or verified role is implied by local profile labels.

### AT-42 — Shared-device and lost-device limits

**Given** the separate-device first-release baseline, **when** onboarding/support describes handover or device loss, **then** it does not claim supported shared-user isolation, developer credential recovery, remote wipe, or instant offline revocation. Any later shared-device mode must pass explicit profile/vault/record-isolation tests before release.

### AT-43 — iPhone/iPad portrait and landscape

**Given** each supported iPhone/iPad model and approved iOS version, **when** the user rotates the device or changes the available iPad window size, **then** each core tab remains usable, content and controls are not clipped, and navigation, unsaved text, checklist/mission state, map selection, and measurement results are preserved. Run the matrix with large text, keyboard shown, and supported multitasking/resizable-window modes.

### AT-44 — Platform, privacy, and safety statements agree

**Given** the release app, About/Help/onboarding, privacy policy, support guide, App Store listing, and reviewer notes, **when** they are compared, **then** supported devices/orientations/iOS range, offline/network behavior, local credential handling, data sources/staleness, safety limitations, contacts, and Android-later status are accurate and consistent. No text claims Apple approval before it occurs.

### AT-45 — App Store submission-readiness evidence

**Given** an iOS build is prepared for App Review, **when** the current Apple requirements are checked, **then** privacy disclosures and metadata, support/privacy links, content/data permissions, public API/SDK privacy manifest and required-reason API checks where applicable, reviewer access/demo mode, screenshots, and on-device stability have recorded evidence. Demo mode reveals no real operator credential or restricted provider data. This test establishes submission readiness, not a guaranteed approval outcome.

### AT-46 — iOS first; Android later

**Given** the initial release target is iOS, **when** build metadata, in-app compatibility text, help material, and the App Store listing are reviewed, **then** iPhone and iPad orientation support is stated and Android is not advertised as currently supported. Android release work is assigned a separate post-iOS-pilot validation gate.

### AT-47 — App Store-reviewed app logic; data-only packages

**Given** an installed App Store build and a candidate downloadable pack, **when** the pack is inspected/validated, **then** it contains only permitted documents/data and cannot add or execute code, scripts, plug-ins, or new app functionality. Parser and feature updates require a separately reviewed app release.

### AT-48 — Local import preserves pack provenance

**Given** a supported pack for an agency/jurisdiction and local rights to use its files, **when** it is imported offline, **then** the importer retains the original sources and manifest, reports unsupported/malformed data, performs no Replit service call, and associates resulting content only with the declared pack.

### AT-49 — Imported material is not automatically approved

**Given** a user imports an agency manual or policy, **when** it lacks verified review/approval metadata, **then** it remains visibly user-supplied and unverified, can be read/searched as allowed, and is not converted into an active operational checklist, rule, threshold, or permission.

### AT-50 — Active agency and jurisdiction context stays separate

**Given** more than one content pack is installed, **when** the user opens a mission, checklist, or frequency/map result, **then** its active agency/jurisdiction context is visible, values are sourced only from the matching applicable pack, and mismatches or missing coverage are shown as unknown/confirmation-needed rather than silently merged.

### AT-51 — Unsupported policy formats do not produce inferred rules

**Given** an imported policy/manual has no reviewed parser or structured schema, **when** the app indexes it, **then** the original document may remain available for attributed offline reading/search, but no safety-critical rule is inferred or treated as approved.

### AT-52 — Import does not grant redistribution rights

**Given** user-imported content is selected for sharing, **when** a pack or mission export is prepared, **then** source-specific rights and explicit user selection are required; local access/import alone does not permit redistribution to another operator or installation.

## 11. MVP release criteria

The MVP is ready for a controlled pilot when:

- Approved content and content owners are identified.
- Core offline flows pass AT-01, AT-02, AT-03, AT-04, AT-11, and AT-13 through AT-16 on target devices, provided the required approved reference data is available.
- The dedicated QRG, CTAF frequency, aircraft-position/bearing, and checklist-variant scenarios pass AT-17 through AT-20.
- Separate FCTAF and multi-area frequency scenarios pass AT-21 through AT-24 against representative, reviewed fixtures and the licensed dataset's declared coverage.
- The data-manager, source-permission, recovery, and zero-Replit scenarios pass AT-25 through AT-27 and AT-30 through AT-32. AT-28 and AT-29 are release gates when the NAIPS and camera adapters respectively are included.
- The Accounts & Security framework passes AT-33, AT-34, and AT-36 on real supported devices; AT-35, AT-37, and AT-38 gate each activated provider connection.
- Multi-operator separation, exports, and release/distribution scenarios pass AT-39 through AT-42.
- iPhone/iPad responsiveness, disclosure consistency, and iOS-first App Store readiness pass AT-43 through AT-47. App Review approval remains Apple's decision.
- Mapping proof-of-concept, map data rights, and offline package distribution are resolved for any map feature included in the pilot.
- No unverified threshold or script is presented as approved.
- Offline, GPS, and stale-data states are understandable in usability testing.
- Data retention, export/backup, and device-loss expectations are documented.
- Operational stakeholders approve the pilot scope and safety-related content.

The agency-neutral importer is a separate P2 follow-on, not a condition of the RFS-first MVP. Before it is offered for additional organizations, AT-48 through AT-52 must pass against each supported import/schema and pack-selection workflow.

## 12. Open decisions

- Confirm whether the candidate documents in the provisional source register are current, approved, and authorized for offline app distribution; identify content owners and update process.
- Which minimum iOS version and iPhone/iPad models must the first pilot support? Android is a separate post-iOS-pilot release phase.
- What mission-note fields and retention rules are required?
- Which offline map source and package format may be used, and how will packages be distributed and updated?
- Which incident, weather, airspace, aerodrome, and HLS data sources are approved for operational use?
- What freshness thresholds should apply to each cached source?
- Are local record export, backup, or device-to-device transfer required for the first pilot?
- Which Microsoft endpoint and authentication method are approved, if forms are included?
- Who signs off safety rules and release readiness?
- Confirm the authorized incident/sector FCTAF assignment source, boundary/validity information, and the process for recording received changes.
- Select and validate a licensed source for complete aerodrome and published airspace/CTAF broadcast-area frequency lookup, including vertical and temporal conditions; coverage is not yet established.
- Obtain provider permission/terms for the intended end-user account integrations; the user confirmed no existing agency Airservices agreement.
- Confirm approved source-specific update/freshness policies and the permitted camera/briefing retention periods.
- Confirm which CASA/myCASA products are actually required and whether a supported app authorization/access mechanism exists; credential storage alone is not a connector.
- Confirm the approved bearing convention for radio-script position reports; map measurements are labeled true, and must not be silently used where a different bearing convention is required.
- Select the signed-build pilot distribution method and confirm multi-operator content/branding permissions, device/user scope, and any distribution fees. Multiple operators are in scope; shared-device mode and team sync are not assumed.
- Define the later generic content-pack format and supported import types; assign who may verify agency/jurisdiction content and how issuer-confirmed approval differs from user-imported material.
- Confirm the policy for local imports whose agency rights allow one operator to view content but not parse, store, export, or redistribute it.

## 13. Provisional source register

This register combines Google Drive discovery, the QRG and RFS SOP supplied directly by the user, and official public RFS/Airservices publication review. The QRG's two pages were reviewed in text and rendered form; relevant sections of the 74-page SOP were extracted page by page. Reading a supplied copy does not establish that it is the latest controlled issue or that offline redistribution is authorized.

The prior Drive-download limitation was resolved for the RFS SOP by the user's direct attachment. Its filename says “January 2025 v1.2.2,” while inspected internal page footers say “Version 1.2 17/2/25.” Confirm the canonical version/effective date with the content owner. Both supplied PDFs carry an “Uncontrolled when printed” notice, which concerns copy control and does not itself establish approval or lack of approval.

| Candidate | Drive metadata / search evidence | Intended use | Status |
|---|---|---|---|
| User-supplied RPAS Operator Quick Reference, A5 two-sided mockup | Both pages reviewed; Side 1 “Fly & Navigate”; Side 2 “Communicate & Administrate.” Filename identifies a mockup; no confirmed controlled revision supplied. | Dedicated Quick Reference tab; source for candidate radio templates and contact layout. | User identifies this as crucial content. Confirm revision, current procedures, contacts, and app distribution approval before operational release. |
| [RFS SOPs Uncrewed Aerial Vehicles (UAVs), January 2025 v1.2.2](https://drive.google.com/file/d/1DEPTQrwP4DyoJa_EJIHVj3jyjgo-8OJK/view?usp=drivesdk) | Also supplied as an attachment and relevant sections read. Internal footers show “Version 1.2 17/2/25,” differing from the filename. | RFS UAV procedures, staged aircraft-specific checklists, frequency and map workflow, battery care, and support contacts. | Confirm canonical current issue, version discrepancy, owner, effective date, and permission to bundle offline. |
| [SLSS Operations Manual, February 2025 V5.3 Final](https://drive.google.com/file/d/1DOJfhUHIaHj8714FkEmOhvNBZmKQtyud/view?usp=drivesdk) | PDF; title includes “Final”; Drive modified 9 March 2025. Indexed search matched UAV/pre-flight/checklist terms. | Candidate operator manual; include only if applicable to the intended operating group. | Verify applicability, current status, approving authority, and offline distribution permission. |
| [SOPs Uncrewed Aerial Vehicles (UAVs) RFS](https://drive.google.com/file/d/1wi-WfQkcKu0BLWivLJzusgm1rFjClm-o/view?usp=drivesdk) | PDF; Drive modified 9 December 2024; older untitled-version copy. | Compare against the January 2025 v1.2.2 candidate to detect duplicate or superseded content. | Do not treat as current until compared and confirmed. |
| [RFS SOPs Uncrewed Aerial Vehicles (UAVs), January 2025 v1.1](https://drive.google.com/file/d/1xQO7jCrFh7_C4yqGsvX5GhImF4OVQtYw/view?usp=drivesdk) | PDF; Drive modified 15 January 2025; older named version than v1.2.2. | Version comparison only. | Likely older than v1.2.2 by filename; confirm supersession before excluding from archival records. |
| [RPAS Mapping](https://drive.google.com/file/d/1AlITCCzUOu28I3KzH3NGVGmhqi4qK_ZZ/view?usp=drivesdk) | PDF; Drive modified 15 February 2026. | Possible mapping workflow/reference material. | Review content and owner before use; not identified as an approved aviation rules source. |
| [RFS SEAC Drone Team — Drone on a page V1.1](https://docs.google.com/presentation/d/1xCZ75WTfqAS0x1QRAmkyBrgJT7yFU-M6/edit?usp=drivesdk) | PowerPoint; Drive modified 3 January 2025. | Candidate overview/context for app terminology and workflow. | Not treated as an SOP or approved checklist without confirmation. |

### Official publication verification for FCTAF and CTAF

| Publication | Verified information | Planning consequence |
|---|---|---|
| [NSW RFS — Fire CTAF Allocation](https://www.rfs.nsw.gov.au/resources/publications/operational-procedures-and-guidelines/strategic/fire-ctaf-allocation) | Page states published 5 November 2026, review required 5 November 2029; no version value shown. Identifies 132.55 MHz as NSW statewide default for the stated aerial firefighting/intelligence context in the absence of a provided FCTAF, excludes routine administrative/non-incident communication, reserves allocation/change to SAD, and covers multiple FCTAF areas and change acknowledgment. | FR-05a: embed a sourced/versioned NSW default reference; record incident/sector assignments separately. The app does not allocate or authorize use of frequencies. Confirm RPAS-specific application with the operational owner. |
| [NSW RFS — Fire Response Airspace Matrix](https://www.rfs.nsw.gov.au/resources/publications/operational-procedures-and-guidelines/technical/fire-response-airspace-matrix) | Aviation; published 13 January 2026; version 1.0. Describes FCTAF use in addition to the appropriate Airservices frequency, including CTAF/Area services, and separate ATC coordination inside controlled airspace. | Keep FCTAF, aerodrome/airspace CTAFs, and other ATS services distinct and available concurrently. Do not imply FCTAF replaces ordinary frequency obligations. |
| [Airservices — Safety net CTAF procedures](https://www.airservicesaustralia.com/wp-content/uploads/CTAF-Safety-Net.pdf) | Refers pilots to ERSA/VTC for CTAF frequencies and to NOTAMs for changes; notes that applicability depends on location and flight context. | Validate source, conditions, current issue, and change handling; a nearest-airport lookup alone is insufficient. |
| [Airservices — General Aviation Data](https://data.airservicesaustralia.com/data-product/general-aviation-data) | Official subscription product includes landing-site CTAF data and ATS communication frequencies. The page specifies subscription and potential royalties/end-user charges. Landing-site CTAF point data alone does not establish complete airspace/broadcast-area coverage. | Data licensing, offline redistribution, and a complete area-geometry/conditions source remain dependencies; no subscription has been purchased and no complete dataset has been validated. |
| [Airservices — AIS publication conditions](https://www.airservicesaustralia.com/aip/aip.asp) | Public terms limit unaltered personal non-commercial screen viewing, exclude internal business use from personal use, and restrict storage/reuse/adaptation absent applicable permission. | FR-17/18: source-specific permission gate; no assumption that public PDF access permits this app's storage, parsing, distribution, or automated update process. |
| [Airservices — NAIPS acceptable use](https://www.airservicesaustralia.com/naips/Account/LogOn) | Free individual registration is offered, but unauthorized automated access/download/extraction and specified reuse are prohibited. | FR-19: no login scraping or assumption that a free user account authorizes an app integration. |
| [Airservices — Flight Briefing Data](https://data.airservicesaustralia.com/data-product/flight-briefing-data) | Published integration product uses a separate SOAP web service and interface-control documentation; lists briefing/update/MET/chart capabilities. Displayed price is AUD 4,020 with possible additional commercialisation charges; billing term was not established. | Authorized NAIPS adapter candidate, gated on agreement, mobile authentication, storage/retention rights, and explicit cost approval. No Replit proxy. |
| [Airservices — Live Weather Cameras](https://weathercams.airservicesaustralia.com/) | Page identifies BOM imagery for aviation purposes, UTC image timestamps, non-regulated status, and availability/currency qualifications. | FR-20: permitted snapshots only; source capture time is distinct from download time; automatic retrieval and cache/redistribution rights still require confirmation. |
| [Expo — SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) | Documents native Keychain/Keystore-backed encrypted storage, authentication options, device-only accessibility, biometric invalidation, Android backup exclusions, and iOS reinstall persistence. | FR-21: configure and test the actual native policy on real devices; do not treat a library default or uninstall as a complete vault-security design. |
| [Android — Keystore system](https://developer.android.com/privacy-and-security/keystore) | Describes non-exportable keys, user-authentication constraints, and device-dependent hardware protection; a compromised process can still potentially use a key. | Distinguish protected key material from credential plaintext during authorized use; verify hardware level and do not make an absolute compromised-client guarantee. |
| [CASA — Create an account in myCASA](https://www.casa.gov.au/resources-and-education/our-systems/mycasa-portal/create-account-mycasa) | Describes provider username/password and Digital ID/myID login. Does not establish third-party app API/OAuth or download rights. | FR-21: provider-owned identity/MFA flow; no myID credential collection and no claimed CASA connector until a supported method is verified. |

The companion **Offline Data Options & Zero-Replit Architecture** comparison documents the reviewed open/no-fee alternatives, official product prices and limits, and the recommended source strategy. No alternative has been verified as a free, operationally complete replacement for Airservices aerodrome/airspace/CTAF/NOTAM coverage.

### Extracted source map

Page references below are PDF page numbers, which also match the inspected SOP's printed page labels.

| Source / pages | Material located | App requirement |
|---|---|---|
| QRG side 1 | Solo/multi-crew action sequence; operating limits and separation; model-specific VLOS maxima; airspace legend; weather/NOTAM shorthand. | Dedicated Quick Reference → Fly & Navigate. Preserve qualifications and source status; do not turn a shorthand card into unconditional legal rules. |
| QRG side 2 | CTAF/blind broadcast, tower request, direct-to-aircraft and end-of-operations templates; loss-of-tower-comms instruction; emergency and agency contact blocks. | Quick Reference → Communicate & Administrate, with links into Communications and the contact directory. |
| QRG side 2 | Callsign “Uncrewed RPA”; report the aircraft's location, not the operator's physical location. | FR-05 and AT-19; explicit aircraft-position confirmation and correctly directed bearing. |
| SOP p. 15, §§6.9–6.10 | Pre-flight and post-flight checks are mandated for all operations in the supplied procedure; completion is recorded during the job. | Distinct local checklist stages; app completion is not an AVCRM submission or approval. |
| SOP pp. 25–26, §§9–9.2 | Pre-operational briefing, general pre-flight and pre-start lists; emergency contacts to hand; airband radio on and correct frequency. | Briefing/checklist workflow and CTAF/radio frequency field. |
| SOP p. 29, §10.5 | Post-flight checklist. | Separate post-flight stage, not a reused pre-flight completion state. |
| SOP pp. 34–35, Appendix 2; pp. 36–37, Appendix 3 | Aircraft-specific checklist material for DJI Mavic Mini 4 Pro and DJI Matrice 30 series. | Aircraft-specific approved checklist variants. |
| SOP pp. 32–33, §13.3; p. 40 | Battery care/storage/replacement and defect/disposal workflow. | Offline battery-care reference and defect/reminder content after owner review. |
| SOP p. 41, Appendix 5 | AUAVS urgent Air Desk 02 9457 1027 and non-urgent support email NSWRFS@surflifesaving.com.au. | Role-labeled contact directory; verify contact currency before release. |
| SOP p. 12, §6.5; pp. 47–48, §§19.1.5–19.1.7 | Nearby aerodromes with bearings/distances, relevant airspace, nearby radio frequencies, and manual frequency addition. | Offline aerodrome distance/direction tools plus sourced or manual CTAF frequency entry, independent of AVCRM integration. |

The QRG's personal/role contact block should be preserved only after the operational owner verifies current contacts and approves its inclusion. The original PDFs remain source references; native app content needs a reviewed content manifest with section/page provenance.

### Verification actions before app content is approved

1. Resolve the supplied SOP's filename/internal-version discrepancy and confirm the controlled QRG revision; review any remaining control/revision-history pages with the content owner.
2. Confirm the authoritative current issue and applicability with the document owner or operational approver.
3. Extract candidate checklist, radio-script, aircraft-limit, contact, and battery-care sections with page references.
4. Have the designated operational owner approve any extracted content and confirm offline bundling rights.
5. Record source, section/page, version/effective date, approver, approval date, and next review trigger in the app's content manifest.
6. Exclude superseded or unverified copies from operational use; retain them only if needed for controlled version comparison.

## 14. Reference notes

- Initial scope and feature concepts are based on the user-provided app brief. Its numerical thresholds and procedure statements are treated as unverified proposals pending operational approval.
- Supplied QRG reviewed: RPAS_Quick_Reference_A5_MOCKUP_1794218938718.pdf, 2 pages.
- Supplied SOP reviewed in relevant sections: RFS_SOPs_Uncrewed_Aerial_Vehicles_(UAVs)_January_2025_v1.2.2_1794219244766.pdf, 74 pages.
- Official RFS Fire CTAF Allocation and Fire Response Airspace Matrix pages were fetched and checked for the FCTAF reference and distinction from ordinary CTAF/ATS frequencies. The statewide reference is not inferred from historical incident documents found in Drive.
- Airservices AIS conditions, NAIPS acceptable use, published Flight Briefing Data interface, and camera notices were reviewed for download/storage/update planning. Public access is not treated as app-integration permission.
- Apple App Store Review Guidelines, App Store review preparation/privacy details, and Human Interface Guidelines layout guidance were reviewed for the iOS-first submission and device-adaptation requirements. Recheck current versions at submission; Apple approval is not guaranteed.
- AlertifyAU is used as a UX reference for incident-oriented mapping, selectable layers, and saved map areas: https://alertify.au
- AVCRM is intentionally deferred; API support and pricing for a custom app connection remain unconfirmed.
