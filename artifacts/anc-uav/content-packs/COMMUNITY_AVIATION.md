# Australian community airport frequencies

## What is bundled

The app bundles a filtered Australian snapshot of OurAirports' `airports.csv`
and `airport-frequencies.csv`. OurAirports releases its data to the **public
domain**, without guarantees of accuracy or fitness for use:
<https://ourairports.com/data/>.
Attribution is retained even though its public-domain release does not require it.
The data dictionary is <https://ourairports.com/help/data-dictionary.html>.
Terms checked 10 November 2026 (Australia/Sydney).

The initial snapshot contains 2,795 Australian aerodromes and 3,945 airport
frequency records. One Australian frequency row failed numeric validation and
was rejected; the rejected count remains visible. These counts describe this
snapshot, **not national completeness**.

`data/ourairports-sources.json` records the exact upstream commit, retrieval time
and SHA-256 checksums of both original CSV files. Both inputs came from that same
commit. The compact `data/ourairports-australia.json` is the runtime snapshot.
To reproduce a snapshot, run from the app directory:

```
node scripts/build-community-aviation.cjs UPSTREAM_COMMIT RETRIEVED_AT_ISO
```

Supply the values in the source manifest. Omitting them explicitly downloads the
current upstream commit for a maintainer rebuild. Original global CSV files are
processed in memory, not committed or bundled. No contacts from the supplied QRG
are added. The initial snapshot contains no identified personal phone/email
descriptions.

## Interpretation: reference records, NOT applicability

* An exact CTAF service label is shown as a community-reported CTAF. Mixed
  TWR/CTAF, a CTAF mentioned under another source service, conditional wording
  or an unexpected radio band is shown as **conditional/unresolved**.
* Other source labels (including FIA, MISC, TWR, FSS, UNICOM and unusual labels)
  and descriptions remain visible as **airport-associated services**. The app
  does not claim they apply throughout a sector or in the surrounding airspace.
* Airport source type is not a controlled/uncontrolled determination or tower
  operating status. Closed sites remain labelled as the source's closed type;
  community data must not be relied on to decide whether a site is active.
* A selected nearby radius is a user-controlled **search filter**, not a
  regulatory, radio-coverage or service-applicability radius. All matching
  airport records are considered. Equal MHz values are not deduplicated.
* Distance, km/NM and initial true bearing are calculated from origin A to the
  source airport coordinate, not from the aircraft unless origin A is the
  aircraft position. No altitude, tower-hours, sector geometry or frequency
  effective dates are invented. Coincident coordinates have no defined bearing.
* A snapshot's retrieval time/commit does **not** indicate when individual
  frequencies were verified or become effective. Effective dates and current
  operational validity remain unknown. Future/incorrect device clocks do not
  establish currency. Results always remain unverified.
* Incident FCTAF assignments are separate operator-entered notes. No record or
  distance allocates an incident FCTAF. Check current authoritative publications,
  NOTAMs and received incident instructions before operations.

This separate community reference store does not modify the authorized imported
navigation pack schema or feed airport points into its geometry/altitude/UTC
applicability engine. Imported spatial results retain their existing semantics.

## Updating and privacy

There is **no request on launch**, telemetry, API key, paid API or Replit runtime
callback. The bundled snapshot and last successfully saved snapshot work offline.

Only tapping the public-data update action makes device-direct HTTPS GET requests:

1. `api.github.com/repos/davidmegginson/ourairports-data/git/ref/heads/main`
   obtains an upstream commit identifier.
2. `raw.githubusercontent.com/davidmegginson/ourairports-data/COMMIT/airports.csv`
3. `raw.githubusercontent.com/davidmegginson/ourairports-data/COMMIT/airport-frequencies.csv`

No coordinates, user searches, account credentials or incident assignments are
sent. The host still receives ordinary connection details such as IP address.
GitHub may rate-limit these public unauthenticated requests; a failure is shown,
not bypassed. Redirects are rejected. Up to 24 MB airport CSV and 4 MB frequency
CSV are allowed, with streamed byte limits and a 90-second combined timeout.

The app validates headers, quoting, row shape, Australian joins, numeric
coordinates/frequencies, unique IDs, a non-empty snapshot and storage size.
It records invalid skipped rows, rejects excessive invalidity and rejects an
unexpected loss of more than 20% of the prior records. This is corruption
detection, not proof of aviation correctness. Both CSVs are pinned to one commit.
The old snapshot remains active until validation and a single AsyncStorage write
succeed. No partially downloaded records are shown. Refresh/storage errors remain
visible; the last successful retrieval time is unchanged on failure.

Unreadable saved data is never automatically overwritten. The bundled/current
in-memory snapshot remains available; **Reload saved data** must succeed before
refresh is enabled. An actually corrupt cache currently needs maintenance rather
than silent destructive recovery.

## Airspace/broadcast-area source review

The search has **not established an unrestricted, complete Australian
airspace/broadcast-area dataset with trustworthy linked radio frequencies**.
It does not establish that no such source can exist.

| Candidate | Rights/access findings | Decision |
| --- | --- | --- |
| OurAirports | Public domain; point aerodromes and associated frequency rows | Bundle community reference records; no published sector geometry/applicability in these CSVs |
| openAIP | <https://www.openaip.net/legal> describes CC BY-NC 4.0 with additional commercial-app wording and attribution/redistribution conditions; data is expressly uncertified | Do not bundle until intended multi-operator/commercial use and exact downloaded product terms are resolved; do not assume “open” means unrestricted |
| Airservices Airspace Data | <https://data.airservicesaustralia.com/data-product/airspace-data> is a paid subscription product, with additional commercialisation charges described | Not used as a free open dataset; existing permission-gated provider work remains separate |
| CASA public explanatory publications | Some explanatory text is CC BY, but the reviewed general airspace-structure/procedure material is not a machine-readable national polygon/frequency database | Do not manufacture boundaries or assignments from explanatory diagrams/text |

Keep absent/incomplete airspace coverage visible. Authorized imported airspace
packs continue to work; community airport results do not fill that gap.

## Checks and remaining limits

Run `pnpm --filter @workspace/anc-uav run test:community`, `test:navigation`
and `typecheck`. Synthetic tests exercise joins, classification, bounded download,
pagination, cache failures and independent imported spatial behavior. No parser
test certifies source accuracy. Physical-device airplane mode, large-data update,
OS storage failure and background/interruption behavior require device validation
before release. No operational or App Store approval is implied.
