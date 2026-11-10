# OpenAIP downloads and personal keys

Aviate.Navigate.Communicate (ANC UAV) uses OpenAIP as **uncertified secondary
reference**, not primary navigation, flight planning, flight clearance, or an
official air-band frequency source. No results does not mean clear airspace.
Use official documents and operational instructions for correct frequencies.

## Source contract checked 10 November 2026

- Documentation: <https://www.openaip.net/docs>
- Core API: <https://docs.openaip.net/>
- Legal/attribution conditions: <https://www.openaip.net/legal>
- Exports: <https://storage.openaip.net/openaip-system-exports/>

The provider documents daily, anonymously readable exports. The native app lists
the AU prefix using S3 ListObjectsV2, requires a complete listing, verifies the
actual `au_apt.json` and `au_asp.json` entries, then downloads both without a key.
Their individual modification times, sizes and ETags identify versions, **not
effective dates**. Coverage is partial/unknown, never certified complete.

JSON is preferred over deprecated XML. The initial scope is Australian airports
and Polygon/MultiPolygon airspaces, including holes and airspaces with no
frequencies. Source altitude units/datums, conditions, frequencies and schedules
are preserved for inspection. Unsupported new schemas reject the update rather
than quietly dropping records. Non-displayed source fields such as runway
dimensions, contact information and creator account IDs are not an interpreted
feature. Source URLs identify the full original public exports.

Only supported single-ring area frequencies with explicit H24 schedules,
supported altitude datums/units and suitable VHF values enter the existing
applicability lookup. Other records remain available in map source details.
Airport-associated frequencies do not acquire an invented radius or implied
applicability. Tower status is unknown; airport type does not infer controlled
status. Overlay drawing is 2D and does not apply altitude, schedules or NOTAMs.
The flat schematic renderer explicitly omits antimeridian-spanning polygons;
native MapLibre retains their GeoJSON.

## Updates, storage and removal

Nothing is fetched on launch, accordion opening, GPS actions or key save.
Check/download require an explicit action. The browser preview explains native
downloads because the bucket did not permit cross-origin requests at review;
there is no Replit or other proxy to bypass that restriction.

Downloads use a streaming byte limit (16 MiB per file), validate complete arrays
and recheck versions before committing. Export rotations, oversized responses,
invalid/empty/duplicate data, network failure and cancellation reject the update.
No automatic retry loop runs; 429 responses establish an in-session cooldown.
A request has a three-minute timeout.

Validated normalized snapshots are bounded to 32 MiB, written as immutable local
files and read back before a small atomic preference pointer is committed.
One previous generation is retained. Corrupt current files can recover from a
validated previous generation with an explicit notice; unreadable data is not
silently overwritten. Failed stages retain the last good data. Old-generation
cleanup is best-effort after a durable commit; explicit removal includes
abandoned stage files. These public files are not encrypted and may enter OS
backups. The downloaded snapshot supersedes only the bundled OpenAIP frequency
generation in lookup, not imported navigation packs or the separate OurAirports
store. Removing it restores the bundled fallback.

Map includes source search, inspection and overlay visibility. The native map
remains usable for tap/GPS measurements; changing layers does not alter radio
applicability. OpenAIP exports are aviation overlays, not satellite/topographic
imagery. Basemap tile management remains separate.

## Optional personal client key

There is no owner/shared app key and no runtime Replit dependency. Do not copy
the project secret into JavaScript, app settings, Expo public variables, assets,
test fixtures or generated bundles. Only each user's device-entered key is used.

The narrow OpenAIP key namespace is separate from the disabled general Provider
Access vault. It never reads or deletes old Airservices/NAIPS credentials.
CASA/myID and AVCRM remain unconnected.

The native build requires enrolled device authentication and SecureStore with
`requireAuthentication` and `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Browser and Expo Go
do not offer weaker persistence. The masked draft is cleared on save and when
the app backgrounds. A non-secret preference marker avoids unlocking credentials
on launch; a missing/failed marker is not authoritative proof a Keychain entry
does not exist. Explicit removal remains available even if authentication
enrolment changed. No show/copy/export-credential action is offered.

After a public snapshot is installed and a record selected, explicit
Fetch/Refresh API detail unlocks the key for a direct GET to one of:

- `https://api.core.openaip.net/api/airports/{24-hex-source-id}`
- `https://api.core.openaip.net/api/airspaces/{24-hex-source-id}`

The key is in `x-openaip-api-key`, never a query string. Hosts and paths are fixed,
redirects are rejected, and errors never echo response bodies or raw request
exceptions. Distinct 401, 403, 404 and 429 messages do not remove the public
snapshot. Details are separately dated and cached: up to 25 active records,
bounded to 3 MiB per generation, with a recovery generation. They do not silently
replace map geometry or the public snapshot's frequency/validity information.
An API key does not guarantee extra data, higher quotas or subscription rights.

Removing the key leaves data/details; removing downloaded data deletes both
source stores and generations, not the key, bundled assets, tile packs or user
imports. Keychain entries may survive reinstall. At-rest device protection is
not absolute secrecy against a compromised device, the OS or the provider.
No developer credential backend or cloud-recovery service exists.

## Attribution, sharing and privacy

OpenAIP data is CC BY-NC 4.0 with the provider's published app-use conditions:
its data must remain free to use/share and not be exclusively sold, with
derivatives under the same or a similar licence. Retain source and legal links,
OpenAIP-contributor attribution and warnings in distributions.

Normalized snapshots include this licence, attribution, legal link and source
metadata. iOS **Share reference data** presents the ordinary JSON file through
the native share sheet, allowing users to save/share the derivative freely.
It contains no key, operator notes or imported data. Sharing sends a file to
another app only if the user completes the share action. Original public source
files are also available at the documented anonymous links.

The export host receives normal connection metadata (including IP), not GPS,
searches, routes or incident notes. The Core API additionally sees the source
record ID and client key on explicit detail requests. No location permission is
needed for downloads. Device-local location-to-polygon tests do not make a
network request.

## Verification and release limits

Run `node --test scripts/test-openaip.cjs` and the app typecheck. The optional
`node scripts/verify-openaip-exports.cjs` validates current public files without
credentials, saves no source asset and must not become a build/runtime
dependency. Native SecureStore and failure cases use synthetic credentials in
unit mocks; these are not physical-device security certification.

Before public release, test the final iPhone/iPad binary in both orientations:
full-country overlays, protected-key authentication/cancellation, enrolment
changes, reinstall/backup behaviour, storage pressure and airplane-mode relaunch.
Review current legal/provider/App Store conditions and disclose actual third-party
requests. No physical-device test or Apple approval is implied by these checks.
