---
name: Offline navigation licensing boundary
description: Why general-reference mapping is separate from authorized operational aviation data.
---

Use public-domain reference geography separately from operational aviation
datasets. Do not scrape Airservices publications or infer an aviation-use
redistribution licence from web access or an operator's account. An imported
licence/completeness claim or operator rights confirmation is not approval.

**Why:** The Airservices AIP terms and copyright request process checked on
2026-11-09 distinguish limited personal viewing from internal business use,
storage, adaptation and redistribution; no executed aviation data agreement
was supplied. Natural Earth's public-domain terms allow the reference-map use
but do not make its populated places authoritative aviation references.

**How to apply:** New provider adapters or bundled operational data require
reviewed permission for the intended use and an independent aviation content
review. Keep missing coverage and unverified/currentness states visible.
Recheck provider terms when considering an agreement; do not treat this note
as permanent legal advice.

NAIPS website automation must not be substituted for its licensed interface,
and camera snapshots must never be presented as current weather.

**Why:** The NAIPS acceptable-use terms checked on 2026-11-09 explicitly
prohibit automated extraction/downloads without prior written authorization.
Airservices separately describes a subscribed SOAP product with supplied
interface documentation. No such agreement or camera-reuse permission was
supplied. A recent import time does not establish an image's capture time.

**How to apply:** Obtain the actual licensed interface and operator/agency
rights before designing sign-in or download requests. Local storage-rights
assertions do not enable adapters. Keep issue/capture time separate from
storage time and label saved camera images historical even just after import.

Airport-associated community frequencies must remain distinct from spatial
airspace/CTAF applicability, even when the data itself is freely redistributable.
openAIP's Australian airspace export is a separate licensed secondary source:
its terms permit inclusion in paid/commercial apps with attribution, the data
not being exclusively sold and remaining free to use/share, and derived data
released under the same or a similar licence. It remains uncertified and is not
for primary navigation or flight planning.

**Why:** OurAirports' public-domain release permits reuse, but its airport and
frequency CSVs do not establish sector boundaries, altitude bands, tower hours,
effective dates or national completeness. openAIP's explicit app permission is
conditional and is not a general commercial redistribution licence for other
providers or products.

**How to apply:** Show airport points as unverified discovery references. For
openAIP, retain attribution and licence/source links, keep its data available
under the required licence, and never present it as certified/current. Never
invent service radii, infer controlled status from airport type or treat
retrieval time as an effective date. Review each additional source's actual
intended-use terms independently.

OpenAIP should use public offline downloads by default, with the option for each
user to enter their own API key for authenticated access on their device.

**Why:** The user explicitly chose public offline downloads plus optional
individual keys, rather than requiring everyone to use one shared app key.

**How to apply:** Do not bundle a project/developer key in the app, even encrypted.
Keep personal keys in device-protected storage, separate from downloaded data,
and do not promise that a key provides extra data or account features unless
the documented API actually supplies them.
