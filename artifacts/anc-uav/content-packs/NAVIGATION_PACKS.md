# ANC UAV offline navigation data

## Rights decision

The bundled **Australia overview reference** is derived from Natural Earth
v5.1.2: 1:110m admin-0 outlines (Australia only) and 1:50m selected populated
places (Australia only). Natural Earth places its vector and raster map data
in the public domain, including commercial modification and redistribution:
<https://www.naturalearthdata.com/about/terms-of-use/>.
Terms checked 9 November 2026. Attribution is retained even though not required.
Source GeoJSON: <https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson>.
The maintainer conversion script is `scripts/build-reference-pack.mjs`.

This is a small reference basemap, **not an aeronautical chart or detailed street
map**. It contains mainland/Tasmania outlines and selected populated places,
not all islands/localities. It deliberately has no inferred aerodromes, radio
frequencies, obstacles, terrain, controlled-airspace boundaries or aviation
validity dates. Geographic zoom does not add detail.

**No Airservices/ERSA/DAH/AIP data redistribution licence has been obtained.**
Airservices' AIP conditions prohibit storage, adaptation and redistribution
outside their limited personal-use permission absent applicable statutory
permission or a separate agreement. Internal business use is not personal use:
<https://www.airservicesaustralia.com/aip/aip.asp>.
Its copyright request process states there is no licence until an agreement is
entered into:
<https://www.airservicesaustralia.com/industry-info/aeronautical-information-management/electronic-data/copyright-licence-request-process>.
Terms checked 9 November 2026. A provider account is not authorization.

Consequently the app ships **no authoritative aviation dataset**. It supports
on-device import of separately authorized packs with a rights-confirmation
step; that confirmation is an operator assertion, not a legal review. Pack
metadata cannot grant itself trusted/approved status. Do not redistribute
provider data, build an automated scraping adapter, or label results approved
without the corresponding data rights and aviation content review.

A separate bundled **OurAirports community reference** now supplies Australian
airport-associated frequencies under that publisher's public-domain release.
These are point-associated records, not authoritative applicability rules or
part of this navigation-pack contract. See `COMMUNITY_AVIATION.md` for the source,
licence, update behavior and airspace coverage limitations.

## Runtime and storage

Everything is computed locally. There is no map SDK, tile URL, API key,
background download or Replit service. The separate community reference makes
device-direct GitHub requests only on its explicit update action; this navigation
import flow makes no server requests. On native devices the
document picker reads a local JSON file and removes its temporary cache copy
after parsing; the validated pack is saved to device-local AsyncStorage. Web
preview uses the browser file picker and local storage, not native filesystem
calls. The bundled overview is available without importing anything.

Navigation imports are separate from agency policy/manual JSON imports.
Select **Map & Measure → On-device navigation packs → Import navigation pack**.
Review publisher, edition, validity, source, licence and rights reference.
Only confirm if you hold the required rights for the intended use. The original
JSON file is not altered. Same identifiers replace an installed pack only after
the replacement notice and rights confirmation. Select a displayed map or
remove an imported pack; the built-in overview cannot be removed/replaced.
Failed writes retain the previous selection. Unreadable stored data is not
silently overwritten. Recovery offers a separately confirmed destructive reset
of navigation storage only, then reimport from original files. Agency packs,
documents and incident assignments are untouched. Retain originals for recovery.

Each import is limited to 8 MB, ten imported packs, and an 8 MB aggregate
storage budget (conservatively estimated as three bytes per UTF-16 character).
Imported data is **always unverified**. There is no automatic currency update.
Install the replacement edition manually after independently checking it.

## Versioned contract

`data/navigation-pack.ts` is the runtime contract; unknown fields are rejected.
`data/australia-reference.json` is a valid reference-only pack.
`scripts/test-navigation.cjs` contains clearly synthetic aviation fixtures for
engineering checks, **not operational data and not included in the app**.

Top-level fields:

* `format`: `anc-navigation-v1`; `id`: stable lowercase slug; `name`.
* `bounds`: `south`, `north`, `west`, `east`, decimal WGS84, increasing
  non-dateline-crossing bounds, latitudes within ±85°.
* `provenance`: `publisher`, HTTPS `source`, `edition`, `retrievedAt` ISO
  timestamp, `effectiveFrom` / `effectiveTo` ISO timestamps or null,
  `licence`, `rightsReference`, `attribution`. Unknown validity stays unknown,
  never "current". Dates are half-open: from inclusive, to exclusive.
* `coverage`: separate `aerodromes`, `localities`, `frequencies`, each `absent`,
  `partial`, or `complete`, plus `notes` detailing geographic/service omissions.
  "Complete" is only an imported assertion, never an app certification.
* `land`: arrays of outline coordinate objects `{latitude, longitude}`.
  Empty means a coordinate grid with no basemap; use simple outer rings.
* `places`: unique `id`, `name`, WGS84 `position`, `kind` (`controlled`,
  `uncontrolled`, `aerodrome-unknown`, `locality`), per-record `provenance`,
  and `statusNote`. Classification is not a live tower-status determination.
* `frequencies`: unique `id`, `label`, `service` (`CTAF`, `TOWER`, `APPROACH`,
  `CENTRE`, `ATIS`, `BROADCAST`), `frequencyMHz` as a string with three decimals,
  per-record `provenance` and `applicability`. CTAF requires `aerodromeId`
  referencing a non-locality place. Non-CTAF records may also reference a place.
  FCTAF is not accepted in navigation packs: use received incident assignments.

Each frequency has an **explicit applicability area**, not a proximity guess:

```
{
  "area": {
    "kind": "circle",
    "centre": {"latitude": -33, "longitude": 151},
    "radiusKm": 20
  },
  "altitude": {"reference": "AMSL", "lower": 0, "upper": 5000},
  "activeUtc": [
    {"from": "2026-11-09T01:00:00Z", "to": "2026-11-09T02:00:00Z"}
  ],
  "condition": "Synthetic illustration only — not a published aviation rule"
}
```

This is only a **schema illustration**, not an authorized operational radius,
altitude or schedule. Populate applicability from the licensed source, never
invent a circle around an aerodrome. A polygon area instead uses
`{"kind":"polygon","ring":[...coordinate objects...]}`. Use simple non-crossing
rings; no holes/multipolygons or dateline crossing. Split complex areas into
separate frequency records. Multiple records with the same MHz are allowed and
retained, including overlapping services and different pack editions.

Altitude is in feet for `AMSL` and `AGL`, and flight-level units for `FL`.
Bounds are inclusive. No terrain/QNH/GPS-altitude/datum conversion is inferred.
Unknown altitude or a datum mismatch produces **possible — check conditions**.
Convert recurring schedules and local/DST times into explicit UTC windows
covering the source validity period. Empty `activeUtc` explicitly means H24
within source validity. Unknown or conditional schedules must use `condition`
to require operator checking; do not represent an unknown schedule as H24.
Non-empty `condition` always prevents an unconditional match.
Unsupported interpretations must be normalized by an authorized data preparer,
not silently discarded. Check the device clock; live time refreshes every 15 s,
or select explicit planned ISO UTC. No timezone-free dates are accepted.

## Display and safety semantics

* Select A, then B on the map (or use foreground GPS for A). Measurements are
  great-circle distances with initial true bearing, in km and NM. The drawn
  connector is not a flight route. Coincident points have no defined bearing.
* GPS is a timestamped **one-time fix**, not tracking. Editing or tapping A
  clears its GPS label. Manual inputs remain available after permission denial.
* Nearby results search **all installed packs** and show the three nearest
  records per category. They are nearest *in installed data*, not nearest
  guaranteed aerodromes on Earth. Direction is from A to the reference point.
* All frequency records in **all installed packs** are evaluated, not just
  frequencies of the nearest aerodrome or displayed basemap. No result-count
  truncation or MHz deduplication hides overlapping frequencies.
* Geographic area, inclusive altitude band, UTC schedule and source validity
  determine a match to imported rules, not clearance to operate/transmit.
  Unknown inputs, service conditions, missing validity, future/expired sources,
  invalid overall pack validity or out-of-pack coverage remain explicit.
* Outside-geometry/altitude/schedule records can be inspected in the excluded
  list. An expired source cannot conclusively exclude a record by its old time
  schedule. No dataset is a live NOTAM service; even excluded records and
  completeness claims can be outdated.
* Missing/partial data never displays "clear", and no approved badge exists.
  Normal aerodrome CTAFs, other ATS/broadcast services, statewide FCTAF
  references and operator-recorded incident assignments remain distinct.

## Verification

Run `pnpm --filter @workspace/anc-uav run test:navigation` and
`pnpm --filter @workspace/anc-uav run typecheck`.
Device airplane-mode/GPS/rotation and iPhone/iPad checks still require real
devices before release. Neither these engineering checks nor legal source
availability constitute aviation or App Store approval.
