---
name: ANC UAV product constraints
description: User-stated product scope and durable content/permission boundaries for ANC UAV.
---

The exact project/app name is **Aviate.Navigate.Communicate (ANC UAV)**. Use it in supporting documents and app identity.

**Why:** The user explicitly corrected and confirmed the name.

**How to apply:** Do not rename or rebrand it casually.

The user wants iOS first, on phones and tablets in portrait and landscape; Android comes later. The product must work offline with zero product-runtime cost or callbacks to Replit services.

**Why:** These are explicit user requirements.

**How to apply:** Keep core data and tools on-device. Development preview tooling is separate from the product runtime; do not introduce a Replit backend dependency.

The initial focus is RFS, but the product should become agency agnostic so other operators can import their own manuals, rules, and policies. AVCRM is a stretch goal and the lowest priority.

**Why:** The user explicitly stated this roadmap and priority.

**How to apply:** Keep agency/jurisdiction content separate. Preserve issuer, source, version, and rights provenance rather than treating RFS defaults as universal.

The user no longer wants a dedicated QRG tab: “Ditch the qrg tab and go with this design instead.” Use the supplied field redesign's Aviate, Navigate, Map, Comms and Settings navigation.

**Why:** The user explicitly superseded the earlier dedicated-QRG-tab requirement.

**How to apply:** Preserve reference provenance and unverified-content warnings without keeping a QRG tab.

Unverified data badges, caveats, and similar notices should be compact and visually secondary while remaining readable; keep critical safety wording visible.

**Why:** The user explicitly requested smaller, less obtrusive unverified-data messaging.

**How to apply:** Prefer compact, subdued status chips and short inline summaries. Keep the essential limitation in view and place secondary detail behind an accessible disclosure.

The user requires incident FCTAF plus statewide references, normal aerodrome CTAFs and airspace frequencies, km/NM conversion, and distance/direction measurements using map taps and/or current location.

**Why:** The user called these out separately and repeatedly.

**How to apply:** Missing aviation/map data must be shown as missing, not as a clear or safe result. Never infer an incident-assigned FCTAF from location.

The NOTAM-to-plain-English tool belongs in Comms and must run entirely on the device.

**Why:** The user explicitly requested on-device conversion in the Comms section.

**How to apply:** Keep pasted text and interpretation local; do not introduce a remote model or server dependency for the converter.

The user selected Open-Meteo's free non-commercial API for local UAV weather and explicitly accepted its terms. MET briefing interpretation must also remain entirely on device.

**Why:** The user requires free weather access and local processing, and selected this source after the non-commercial restriction and coordinate sharing were explained.

**How to apply:** Weather may send a rounded requested position directly to Open-Meteo with consent, without a Replit relay. Do not extend use of the free endpoint to commercial operators under the app's broader agency-neutral roadmap.

Aircraft distances must be user-configurable from their own operations manuals. The user specified Mini, M30T and combined Matrice 4/5T defaults, with 800 m for Matrice 4/5T, and aircraft-row caps of four on phones and six on tablets. General reference figures and aircraft distances must be saved together in custom operating profiles, including VLOS/EVLOS/BVLOS labels, with multiple versions depending on the covering ReOC.

**Why:** The user supplied these product requirements; the 800 m figure is their requested default, not independently verified manufacturer or regulatory guidance.

**How to apply:** Do not treat a default, operation-type label, ReOC label or a user-entered manual reference as operational approval. Preserve independent ReOC/manual settings, operator editing and device-size row limits when changing this feature.

Account ownership is not permission for a third-party app to automate or redistribute provider data. Credential storage is device-only; provider download adapters remain gated on reviewed authorization and terms. Imported policies and mockup QRG material do not become approved operational content merely by import.

**Why:** No provider/agency data agreement or operational content approval has been established for the product.

**How to apply:** Keep imported content unverified and prevent it from granting itself trusted status. Do not claim operational or App Store approval without the corresponding review.
