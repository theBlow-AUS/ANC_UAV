# Offline Data Options & Zero-Replit Architecture

## Aviate.Navigate.Communicate (ANC UAV)

**Research date:** 9 November 2026  
**Status:** Planning and source/licensing comparison, not an operational data approval  
**Project/app name:** Aviate.Navigate.Communicate (ANC UAV)  
**Companion:** Product Requirements Document v0.8

## Recommendation

Build a compiled native app that stores its working data locally and makes **no runtime calls to Replit services**. Use a common in-app **Data & Downloads** manager to download permitted products, import authorized packs, parse/index them on-device, and retain their sources and versions.

The product is **Aviate.Navigate.Communicate (ANC UAV)**. The initial RFS-focused release uses an authorized NSW RFS content pack; keep agency-specific procedures and NSW defaults in that pack rather than embedding them as universal app rules. Plan a later agency-neutral extension so other operators can import their own authorized manuals, rules, and policies locally.

For the no-fee baseline, use approved agency-owned references, legitimately reusable offline basemap data, and local calculations/storage. Add authoritative aerodrome/frequency/airspace packs under confirmed rights before presenting the location-frequency feature as operationally complete.

Do not promise a free automated Airservices pipeline based on public website access. The reviewed AIP and NAIPS conditions impose material restrictions, while Airservices publishes licensed data products and a NAIPS SOAP interface. The user confirmed there is no existing agency agreement. The requested device-only end-user account vault is included in the plan, but a user's credentials do not themselves authorize app automation, parsing, retention, or redistribution.

**No paid data subscription, hosting service, or integration has been purchased or enabled.**

**Distribution baseline:** plan for other operators too, with independent installations on operator-controlled devices. This is not approval to publish or an assumption of RFS or other agency endorsement. User/device counts, third-party content distribution rights, and signed-build distribution costs must be considered at that scope, not personal-use-only scope.

## 1. What “zero cost/callback to Replit” means

The installed app will not depend on Replit hosting, databases, authentication, AI models/gateways, connector proxies, licence checks, telemetry, or update endpoints. It will not need an internet connection or a Replit account to open installed documents, use checklists, calculate distances, convert km/NM, search installed data, or access downloaded maps.

Proposed local foundation:

- React Native/Expo compiled for iOS first on iPhone and iPad, rather than a Replit-hosted website wrapper. Android is a later, separate release.
- SQLite for mission records, structured reference data, and local indexes.
- Durable device files for PDFs, licensed map packages, source responses, and permitted images.
- Native offline map rendering, with a MapLibre-based approach subject to the target-device proof-of-concept.
- Deterministic local parsers and calculations; no required hosted AI.
- OS-protected storage for any permitted individual provider credential; no embedded confidential publisher/service credential.
- Direct HTTPS updates from approved providers, or file import from an authorized agency distribution route.

Fonts, map styles, glyphs, sprites, and other supporting assets must also be installed locally. A downloaded map is not truly offline if its style still requests remote assets.

Data-only document/reference packages may be updated without an app-binary release. Parser, executable-logic, or feature changes must ship through a signed app update. A Replit shutdown or unavailable Replit account must have no effect on an already installed app.

This is a **runtime architecture and Replit-service cost requirement**, not a statement that development tools, build/distribution services, app-store accounts, devices, mobile data, or third-party licences are free. No compulsory paid cloud service is proposed; any supplier fee remains a separate opt-in decision.

## iOS-first device and App Store scope

The first platform target is **iPhone and iPad**, with core workflows working in portrait and landscape. The interface must adapt to iPad available window size/multitasking, keyboard appearance, and system text/display-size settings rather than merely scaling up a fixed phone layout. The exact minimum supported iOS version and device matrix remain implementation decisions to test and disclose. **Android is a later phase** and is not supported by the first iOS release.

Plan the iOS build against Apple's current [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), including its guidance that iPhone apps should run on iPad whenever possible, and Apple's [layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) for adapting to orientation, available window size, and multitasking. Apple requires app privacy details for submissions; see [App Store privacy details](https://developer.apple.com/app-store/app-privacy-details/) and Apple's [review preparation guidance](https://developer.apple.com/app-store/review/). Keep the App Store listing, review notes, in-app About/Help, privacy policy, and supporting operator documents consistent. Include a reviewer/demo mode with synthetic data, not a real operator's credentials or restricted account access.

“Prepared against Apple's applicable requirements” is a verifiable project goal; **App Store approval cannot be guaranteed** and is Apple's decision. Check the live rules again at each submission.

### End-user account vault

Add **Accounts & Security** with provider-specific, device-only encrypted secret/token storage. Use iOS Keychain and Android Keystore-backed encrypted storage with OS-enforced user verification, non-migrating/non-synchronizing settings, and tested backup exclusions. Prefer a supported provider token flow over saving a password.

There will be no developer master key, remote support retrieval, server copy, cloud credential backup, or secret export/recovery feature. User-entered secrets will not enter Replit, logs, analytics, source archives, mission exports, or plaintext local databases. Authentication data may be released only to the matching verified provider authentication endpoint. Actual credentials are entered on-device, not in this chat.

[Expo SecureStore documentation](https://docs.expo.dev/versions/latest/sdk/securestore/) documents Keychain/Keystore-backed storage, user-authentication options, backup restrictions, biometric-key invalidation, and iOS credentials potentially surviving reinstall. Those details require real-device testing and explicit deletion/fresh-install behavior; uninstall alone is not a dependable wipe mechanism. [Android's documentation](https://developer.android.com/privacy-and-security/keystore) describes non-exportable key protection and hardware support that varies by device.

The security promise is **no developer-access/recovery mechanism**, not that a compromised device, exploited client, or malicious replacement build could never access a secret during its use. A client using password authentication needs to use the password transiently; encryption at rest cannot make that fact disappear.

Keep “vault unlocked,” “signed in,” “entitled to this content,” and “authorized for automated download/storage” separate. Do not invent a generic AIP login. Public publications, licensed Airservices products, NAIPS accounts, and CASA accounts have distinct access rules.

[CASA's public account guidance](https://www.casa.gov.au/resources-and-education/our-systems/mycasa-portal/create-account-mycasa) describes username/password and Digital ID/myID login, but no supported third-party integration was verified. Keep identity/MFA in the provider's official flow; never collect myID credentials. Use external-browser authorization only where the provider actually supports the app flow. Without a supported interface/permission, the profile must not imply a working download connection.

Unlocking secrets may require user presence and therefore prevent unattended refresh while locked. Show that limitation rather than weakening the vault. Forgetting an account deletes the app's stored secrets; provider-side session revocation/logout is handled through supported provider mechanisms. There is intentionally no developer recovery path.

### Multiple operators without a team backend

Each installation has its own records, vault, sessions, and saved locations. No shared provider credentials, developer login, central account service, or automatic mission synchronization is included. A local name/role is not a verified agency identity or operational approval.

The initial supported model is one operator context per installation, not account switching on a shared tablet. Shared-device profiles and handover require a separate isolation design before release. There is no app-operated remote wipe or instant revocation of already-offline data; provider revocation and existing agency device management remain separate.

Source licences must cover the multi-operator audience and intended distribution, not just one account holder's access. Mission sharing must not automatically redistribute licensed packs or personal provider documents. Diagnostics/exports must be sanitized, previewed, and user-initiated, with no secrets.

### Agency-neutral content and import boundary

Keep reusable app functionality separate from agency content. The initial operational scope is an authorized NSW RFS pack; later, operators may import their own manuals, rules, policies, checklists, contacts, and structured reference data from local storage, without Replit or a central account.

An import retains the original files and manifest metadata: issuer/agency, jurisdiction, source and version, effective/expiry dates, applicable region, declared use/distribution rights, parser/schema and review state. **Import does not mean verified, current, authorized, or operationally approved.** Unverified manuals can be presented as attributed, searchable references where supported; the app must not infer safety-critical rules from arbitrary text. Structured policy/rule extraction requires a reviewed schema and content-owner approval.

When multiple packs are installed, the selected agency/jurisdiction context must be explicit for missions, checklists, and frequency lookups; never silently merge or substitute procedures between packs. No content pack can install executable code or app features. A user's right to locally use an imported file does not automatically permit sharing it with another operator or packaging it for general distribution.

## 2. No-fee and existing-entitlement options

| Option | Cost/rights evidence | Useful offline role | Important limit / recommendation |
|---|---|---|---|
| Approved QRG/SOP and agency-owned content | No external feed is required for local viewing. App distribution rights and controlled revision still need owner confirmation. | Dedicated QRG tab, staged checklists, radio templates, contacts, local mission tools. | Recommended core. Ownership of a copy does not establish rights to redistribute third-party material embedded in it. |
| Agency-licensed Airservices exports or packs | Not currently available: the user confirmed no existing agreement. A future agreement would need to cover users, devices, storage, extraction, and updates. | Potential authoritative publication and structured reference packs, distributed/imported without Replit if rights are obtained. | Not a current no-cost solution. Personal credentials or public PDF access are not substitutes for the applicable app-use permission. |
| [OpenStreetMap data](https://www.openstreetmap.org/copyright), with [Geofabrik Australia downloads](https://download.geofabrik.de/australia-oceania/australia.html) | OSM data is reusable under ODbL with attribution and applicable database/share-alike obligations. Geofabrik publishes downloadable extracts and an experimental vector MBTiles package. | Offline ground basemap and contextual features. | Recommended basemap candidate, not an aviation-authority layer. Package compatibility, size, coverage, update terms, and bundled styles/fonts need validation. Do not bulk-download OSM's public raster tiles. |
| [Geoscience Australia AUSTopo](https://www.ga.gov.au/news/australias-full-national-topographic-library-at-your-fingertips) | Official announcement says free download, offline mobile use, and CC BY 4.0 reuse. | Offline topographic PDF references and regional overview. | Useful optional reference. Scale is 1:250,000: not a substitute for detailed incident mapping or aviation charts. Native georeferenced map integration has not been tested. |
| [Composite Gazetteer of Australia](https://researchdata.edu.au/composite-gazetteer-australia-mapserver/3952880) | Catalogue identifies CC BY 4.0; national approved place-name points are downloadable. | Approximate descriptive locality lookup, with feature type and source meaning shown. | Provider explicitly warns against navigation, precise positioning, or safety-of-life use. Do not use it as the sole tactical position or safety reference. Operational use of descriptive reports requires review. |
| [OurAirports](https://github.com/davidmegginson/ourairports-data) | Official repository is updated daily and includes airport/frequency CSVs; [repository licence](https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/LICENSE) is the Unlicense/public-domain dedication with no warranty. | Prototype/general-reference aerodrome points and community frequency records. | Not a verified authoritative operational source. CSV headers do not supply controlled-status/service hours or published CTAF-area applicability. Do not infer control status from airport size/type, or claim all applicable CTAFs from these records. |
| [openAIP](https://www.openaip.net/legal) | Legal page states CC BY-NC 4.0 and additional guidance permitting some paid-app bundling while prohibiting exclusively selling the data. Applicability to this distribution/use has not been established. | Potential community-data comparison/prototyping only. | Provider says data is not certified and must not be used for primary navigation or flight planning. Not recommended as the operational authority; do not assume “open” means unrestricted business use. |
| [NOAA Aviation Weather Center public API](https://aviationweather.gov/data/api/) | Documents machine-to-machine access and worldwide METAR/TAF/SIGMET products; no price is listed on that documentation page. Rate limit is 100 requests/minute, with cache products suggested for large queries. | Candidate source for received aviation-weather snapshots without a Replit proxy. | Not a NAIPS replacement: no demonstrated equivalence for Australian NOTAMs, all briefing products, or completeness. Australian coverage, terms, latency and native-client access need validation. Documentation says no browser CORS; the native app route must be tested directly. |

### Important basemap restriction

[OSMF's tile policy](https://operations.osmfoundation.org/policies/tiles/) prohibits offline/prefetch/bulk use of `tile.openstreetmap.org`. A “download area” feature cannot legally be implemented by sweeping those public tiles.

Use a legitimately downloadable data/package source, or build packs from licensed/open extracts. Geofabrik's experimental MBTiles listing is a candidate to test, not a guarantee of mobile compatibility or production availability. Avoid creating a paid hosting obligation merely to distribute maps; bundled packs and authorized direct-download/import paths should be evaluated first.

## 3. Official Airservices options

The prices below are the **displayed AUD product prices** on the reviewed pages. The billing period, GST treatment, complete entitlement, support, and any setup/ongoing charges were not established. They are not quotes or estimates of total project cost, and should not be added together as if they were a complete package.

| Official option | Displayed price | What the page provides | Decision |
|---|---:|---|---|
| [General Aviation Data](https://data.airservicesaustralia.com/data-product/general-aviation-data) | AUD 1,950 | Landing-site records including CTAF frequencies, plus ATS communication frequencies and other datasets. | Candidate official point/frequency source. Does not alone establish complete published airspace/CTAF broadcast-area coverage. |
| [Airspace Data](https://data.airservicesaustralia.com/data-product/airspace-data) | AUD 1,950 | Structured airspace boundary data, including controlled airspace, PRD/SUA, FIA/FIR, ATC sectors and other listed features, with upper/lower limits. | Candidate official geometry source. The listed package does not by itself prove a complete CTAF broadcast-area/frequency lookup; confirm the exact product combination and relationships. |
| [AIP Book](https://data.airservicesaustralia.com/data-product/aeronautical-information-publication-australia-aip-book) | AUD 1,950 | Complete AIP Book and amendment PDFs associated with the relevant AIRAC date. | Supports a licensed offline document adapter. This single product is not proof that ERSA, DAH, DAP and every chart are included. |
| [Flight Briefing Data](https://data.airservicesaustralia.com/data-product/flight-briefing-data) | AUD 4,020 | A separate NAIPS SOAP service and interface-control documentation; listed functions include pre-flight/location/area briefings, briefing updates, MET forecasts and charts. | Real authorized integration route to assess. Contract, permitted mobile authentication, caching/retention, redistribution, and fees must be resolved before activation. Read-only briefing use first; no automatic scope expansion into flight-plan submission. |

The product pages also state that royalties or end-user charges may apply when commercialising products/services using the data. The applicable treatment of an internal operational app needs confirmation, not assumption.

### Public AIP website is not an unrestricted offline licence

The [AIS conditions](https://www.airservicesaustralia.com/aip/aip.asp) allow limited unaltered personal, non-commercial screen viewing, and explicitly say personal use does not include internal business purposes. They restrict storage in retrieval systems, reproduction, alteration and redistribution without applicable permission, subject to statutory exceptions and separate agreements.

Therefore, public availability does not establish permission for the proposed internal operational app to automatically download, parse, index, store, or distribute the material. Obtain the appropriate permission or use an existing agreement that demonstrably covers this use.

### Free NAIPS account does not mean free automated integration

The [NAIPS login/acceptable-use page](https://www.airservicesaustralia.com/naips/Account/LogOn) offers free individual registration but prohibits automated tools accessing/downloading/extracting data without prior written authorization. It also restricts specified reuse without prior written consent.

Use the licensed/authorized service rather than scraping the login website. A user logging in manually, a WebView, a headless browser, or importing a saved file does not automatically eliminate the relevant storage/processing/use restrictions.

### Weather cameras need their own permission and freshness policy

The [Airservices weather-camera site](https://weathercams.airservicesaustralia.com/) identifies Bureau of Meteorology-supplied imagery for aviation purposes and restricts other-purpose use. It says images are not a regulated service, do not replace official forecasts/observations, and should not be relied upon to be available or up to date for flight planning or in-flight decisions.

This is not evidence of either a blanket ban on all aviation snapshots or unrestricted third-party image caching. Confirm automated access, local retention and redistribution rights, including relevant image-owner conditions. No camera API, operational service guarantee, or unrestricted cache permission was established in this review.

## 4. How the app's own update functionality should work

The same local manager should support multiple source adapters rather than hard-coding every provider into screen logic.

| Product family | Stored locally | Parsing/indexing | Update/freshness treatment |
|---|---|---|---|
| AIP/ERSA/DAH/DAP/SUP/AIC/charts, where licensed | Original documents, edition/effective dates, notices, provenance, permitted prior editions. | Local text/search index; validated structured fields only where reliable. Prefer official structured data for map/calculation functions. | Publication-specific issue/effective dates. Stage future issues. Apply amendments only to matching bases and only where permitted/validated. Do not assume every product follows the same cycle. |
| Aerodrome/airspace/frequency packs | Source records, compatible structured tables, geometry, altitude/service conditions, coverage manifest. | On-device schema/geometry/unit validation and spatial lookup. | Install compatible records transactionally. Retain the prior valid pack on failure; show gaps, unknown conditions and stale coverage. |
| NAIPS products, where authorized | Exact received products, briefing reference, query scope, issue/validity/receipt times, updates/replacements/cancellations. | Reviewed deterministic parsing with original text available. | Offline snapshot only. A successful earlier briefing cannot establish the absence of newer NOTAM/weather changes. |
| Permitted weather-camera images | Camera identity/location/view metadata, capture time, download time, original image/notices. | Metadata extraction only; no fabricated current weather inference. | Label saved images as snapshots. Re-downloading the same image must not make its capture time newer. |
| Own/agency-approved operational references | Source document, controlled version and content approval metadata. | Local search, links into native QRG/checklist/script UI. | Reviewed content updates independent of app-binary releases. |

### Pipeline

1. Confirm permitted use and the approved source/interface.
2. Check availability and show expected transfer/storage requirements.
3. Download to staging, with bounded retry/resume where supported.
4. Verify integrity and publisher/agency authenticity where supported.
5. Parse and validate locally; quarantine unknown/invalid data.
6. Atomically activate a compatible, effective pack.
7. Keep provenance, update logs, mission snapshot references, and recoverable prior data where permitted.

A local hash detects integrity changes but is not proof of an authentic publisher. Keep TLS/source verification and available signatures distinct from checksums.

Manual foreground update controls are required. Optional background refresh is best-effort under iOS/Android restrictions and provider rules, not a guaranteed closed-app service. There is no required startup phone-home.

The native client should connect directly when the provider expressly supports that authentication model. If NAIPS or another supplier requires a confidential publisher credential, do not put it in the app. Any agency-operated gateway would be a separately approved non-Replit option with its own cost/security review—not a hidden default.

## 5. Recommended delivery order

1. **No-fee local foundation:** QRG, approved SOP/checklists, mission notes, radio templates, FCTAF/CTAF separation, distance/conversion logic, Data & Downloads, and the device-only Accounts & Security framework. Do not prebundle restricted third-party content without rights.
2. **Offline map/reference proof-of-concept:** test a legitimately downloadable regional basemap and local asset completeness; evaluate AUSTopo as an optional overview. Keep locality/airport community records explicitly descriptive or prototype-only until approved.
3. **Authoritative aviation pack:** establish appropriate source permissions or a new agreement; none currently exists at agency level according to the user. Verify each supported end-user authentication/entitlement model separately from app-use rights. Validate controlled/uncontrolled status, aerodrome CTAFs, published broadcast/airspace areas, altitude/time conditions and update handling before validating “all applicable CTAFs” within declared coverage.
4. **Authorized dynamic adapters:** add read-only NAIPS briefing receipt and permitted camera snapshots, with source-specific freshness/retention. Keep fee-based access off unless expressly approved.
5. **AVCRM:** remains the lowest-priority stretch goal.

## 6. What is and is not established

Established from the reviewed sources:

- A zero-Replit-runtime architecture is a feasible design choice; it does not require Airservices scraping.
- No-fee/open options exist for ground mapping and general references, subject to licences and suitability limits.
- Airservices offers licensed structured/static products and a distinct NAIPS SOAP interface.
- Public AIP/NAIPS access does not establish the permissions required by the proposed automated offline operational app.
- OurAirports airport and frequency CSV endpoints returned HTTP 200 in a bounded header-only probe. The inspected fields include coordinates and frequencies but not a controlled-status/service-hours/applicability model.

Not established:

- Any right to bundle/store/parse Airservices products through this app; the user confirmed no existing agency agreement, and end-user authentication is not equivalent to app-use authorization.
- A zero-supplier-fee, operationally complete aerodrome/airspace/CTAF/NOTAM dataset.
- Complete Australian coverage or suitability of community sources or the NOAA candidate.
- Camera automation/cache rights, supported authenticated mobile flow, or data-provider service guarantees.
- End-to-end parser accuracy, map-engine compatibility, signed-build network behavior, or operational approval.

No operational dataset was installed into a working app and no provider authentication was attempted. The PRD's 42 acceptance scenarios now cover multi-operator distribution/separation, the device-only vault, source permissions, local parsing, effective dates, recovery, stale snapshots, and verification of zero Replit runtime traffic.

A preceding bounded connected-Drive search did not identify an obvious applicable agreement. The user's subsequent confirmation that no agency agreement exists is the current planning basis.
