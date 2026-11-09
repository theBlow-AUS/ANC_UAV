# Authorized local reference snapshots

The native app's **Library → Reference snapshots & updates** supports local files
the operator is entitled to store. This is not a provider download adapter,
a licence grant, or a verification of an operator's rights. All direct adapters
remain blocked after the permission review described in `PROVIDER_PERMISSION_REVIEW.md`.
No manual import, account entry or manifest can unlock them.

## Import

1. Establish permission for the specific material, operator/agency, retention and
   intended use. Use the provider's own supported channels outside ANC UAV to
   obtain it. Do not scrape a provider or bypass sign-in/access restrictions.
2. Prepare a UTF-8 JSON manifest up to 16 KB using the example below. Never put
   passwords, tokens, account identifiers or private briefing content in it.
3. In the native app select the provider, tap **Import authorized local snapshot**
   and confirm your local-storage rights. Select the manifest, then its
   matching reference file. Cancelling either picker leaves existing copies alone.
4. Review its source and declared dates in the saved list. Metadata and content
   remain **user-imported-unverified**, regardless of what the manifest claims.

```json
{
  "schemaVersion": 1,
  "provider": "naips",
  "referenceId": "your-stable-reference-id",
  "title": "Your authorized reference title",
  "sourceUrl": "https://www.airservicesaustralia.com/naips/Account/LogOn",
  "sourceIssuedAt": null,
  "effectiveFrom": null,
  "effectiveTo": null,
  "rightsReference": "Your actual permission or licence reference",
  "authorizedUseScope": "Covered operator/agency and permitted local use",
  "format": "text"
}
```

Use real publication issue times or camera capture times, not download/import
times. Dates must be full ISO UTC timestamps such as `2026-11-09T01:00:00Z`;
use `null` when unknown. There is no assumed validity duration. Import time is
recorded separately by the device. Dates and URLs are declarations, not proof of
authenticity. Source URLs are provenance only and are never fetched.

| Provider | `provider` | Formats | Official source host/path |
| --- | --- | --- | --- |
| Airservices AIP | `airservices` | `pdf` | `https://www.airservicesaustralia.com/aip/…` |
| NAIPS | `naips` | `pdf`, `text` | `https://www.airservicesaustralia.com/naips/…` |
| Weather cameras | `weathercams` | `png`, `jpeg` | `https://weathercams.airservicesaustralia.com/…` |

Queries, fragments, embedded credentials, non-HTTPS URLs, unrecognized fields,
paths and self-approval fields are rejected. Keep `referenceId` stable across
versions; letters, digits, underscore and hyphen only.

Files must be non-empty and at most 10 MB. Plain text has an additional
180,000-character / 720,000-byte ceiling and rejects obvious HTML/login pages,
active content and invalid UTF-8 replacement characters. Binary checks test PDF
header/end marker and PNG/JPEG signatures/end markers. These are structural
checks only: **not** a full PDF/image security audit, source-authentication check,
or extraction/validation of AIP tables, NAIPS messages or meteorological data.
The OS previews PDFs; plain text and local images display in-app. A malformed
image that passes signature checks may still fail the device decoder; that
failure is reported and never interpreted as weather.

## Updates, offline use and deletion

- **Import replacement locally** requires the same provider and reference ID,
  and rejects an older or missing source time when the selected copy has one.
  It performs no internet refresh.
- The file is copied into staging, structurally validated, and committed with
  its metadata by a directory rename. Cancelled/failed imports cannot overwrite
  an existing version. Earlier versions are deliberately retained.
- Every saved version has its own removal control. No automatic expiry deletion
  removes a reference an offline operator might still need. Old versions remain
  visibly stale or unverified rather than appearing updated.
- App restart reloads and revalidates metadata and file structure. Broken copies
  produce an explicit local-storage error. Interrupted staging copies are not
  loaded as references.
- The app does not probe connectivity: local viewing is offline; no provider
  connection or online currentness is claimed. Official-site links open the
  system browser on explicit action and require internet.
- Missing/future dates, expired validity, not-yet-effective references and
  within-declared-dates-but-unverified references have distinct labels.
  Status updates when the app resumes and every 30 seconds. Device clock
  correctness is the operator's responsibility.
- Camera images **always** say **HISTORICAL IMAGE — NOT CURRENT WEATHER**, including
  immediately after import. Capture time may be unknown. Do not use them as
  live weather observations.

The browser preview intentionally cannot acquire/store device reference files.
Ordinary reference files are **not** credentials and are **not** placed in
SecureStore. They may be included in OS backups; do not import material whose
agreement disallows that until exclusion has been implemented and tested.
