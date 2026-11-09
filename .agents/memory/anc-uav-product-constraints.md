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

The user requires a dedicated QRG tab, incident FCTAF plus statewide references, normal aerodrome CTAFs and airspace frequencies, km/NM conversion, and distance/direction measurements using map taps and/or current location.

**Why:** The user called these out separately and repeatedly.

**How to apply:** Missing aviation/map data must be shown as missing, not as a clear or safe result. Never infer an incident-assigned FCTAF from location.

Account ownership is not permission for a third-party app to automate or redistribute provider data. Credential storage is device-only; provider download adapters remain gated on reviewed authorization and terms. Imported policies and mockup QRG material do not become approved operational content merely by import.

**Why:** No provider/agency data agreement or operational content approval has been established for the product.

**How to apply:** Keep imported content unverified and prevent it from granting itself trusted status. Do not claim operational or App Store approval without the corresponding review.
