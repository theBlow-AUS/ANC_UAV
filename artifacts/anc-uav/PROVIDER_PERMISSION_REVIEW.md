# Provider acquisition permission review

Public sources reviewed **9 November 2026** for Aviate.Navigate.Communicate
(ANC UAV). This is an engineering enablement decision, not legal advice.
No executed provider agreement, agency authorization or licensed interface
documentation was supplied. Recheck terms and obtain legal/content review
before any enablement. Public website access is not a storage or redistribution licence.

## Decision matrix

| Provider | Evidence | Decision for this build |
| --- | --- | --- |
| Airservices AIP / AIS publications | [AIP copyright and conditions](https://www.airservicesaustralia.com/aip/aip.asp): unaltered personal non-commercial screen viewing only; personal use expressly excludes internal business purposes. Reproduction, retrieval-system storage, redistribution and adaptation require prior written permission except where statute permits. | **Blocked.** Do not scrape PDFs, auto-accept terms or infer an agency licence from public access. |
| NAIPS | [Login acceptable-use terms](https://www.airservicesaustralia.com/naips/Account/LogOn): each user needs an individual account. Automated access/extraction/download/monitoring without prior written authorization is prohibited; reproduction, redistribution and products/services require prior written consent. [Flight Briefing Data](https://data.airservicesaustralia.com/data-product/flight-briefing-data) describes an independent subscribed SOAP service and a supplied Interface Control Document, not a public website automation API. | **Blocked.** No login scraping, guessed SOAP payloads, shared credentials or unlicensed API. A regular NAIPS username/password is not developer authorization. |
| Airservices weather cameras | [Camera site](https://weathercams.airservicesaustralia.com/) permits public viewing but the reviewed material did not establish an app automation/offline retention/multi-operator reuse licence or supported retrieval contract. General terms link from AIP resolved to a privacy policy during review, which is not a substitute for content permission. Camera ownership and attribution may need separate agreement. | **Blocked.** No camera-page scraping, image polling, proxy, invented endpoint or inferred reuse permission. Local copies are historical only. |
| CASA / myID | No supported app authorization design or agreement supplied. | **Blocked; no credential capture.** |
| AVCRM | No interface or rights supplied; lowest-priority stretch goal. | Not connected. |

Only operator-supplied, locally selected references they are entitled to store
can be added using the separate snapshot import flow. Rights declarations are
recorded as unverified and do not enable a provider adapter. No app endpoint,
remote feature flag, content pack, imported manifest, vault entry or operator
checkbox grants adapter approval.

## Before enabling any future adapter

1. Obtain executed permission naming the product and permitted data, automated
   acquisition, local storage/retention, updates, adaptation, attribution,
   backup behavior and any distribution. Determine whether the app vendor may
   distribute content or only an individually entitled user may retrieve it.
2. Review the rights for **each** intended operator/agency and jurisdiction.
   A licence held by one agency must not silently apply to another. Determine
   whether individual seats, royalties or commercial subscriptions are needed.
   Subscription charges would need explicit reconciliation with the product's
   zero-runtime-cost requirement; do not introduce them silently.
3. Obtain the provider's supported interface/authentication documentation and
   test access. Do not reverse-engineer sign-in forms or bypass access controls.
   Scope TLS origins, redirect behavior, token audience/expiry, cancellation,
   size bounds and retries before transmitting a credential.
4. Keep authorization entirely on-device: supported system-browser authorization
   where specified, protected credentials/tokens in native SecureStore with
   device authentication and `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. No AsyncStorage,
   logs, clipboard, cloud credential copies, Replit backend/proxy or remote jobs.
   Never store CASA/myID passwords.
5. Implement a provider-specific response parser against the actual licensed
   schema and fixtures. Validate source/effective/capture timestamps and
   publication completeness. Do not treat an HTTP 200, HTML login page, import
   success or last-download timestamp as evidence of current aviation data.
6. Stage, validate and atomically publish local snapshots; keep the last
   usable copy after offline/authentication/network/validation/storage failure.
   Expose stale, unknown, expired-auth, offline and error states. Camera images
   remain historical when offline, irrespective of recent download success.
7. Complete security, device backup/restore and aviation-content review and
   update release-owned policy. No in-app approval switch is provided.

## Verification in this build

`pnpm --filter @workspace/anc-uav run test:references` exercises policy gates,
manifest/payload validation, local commit/reload, cancellation, disk failure,
replacement retention/deletion, stale/unknown timestamps and native-only vault
guards using synthetic fixtures. These tests do not claim real Keychain,
biometric, document-picker, image-decoder, OS preview or backup verification.
Those remain pre-release device acceptance checks, as described in
`APP_STORE_PRIVACY_AND_COMPLIANCE.md`.
