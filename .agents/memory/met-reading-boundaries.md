---
name: MET reading boundaries
description: Safety rationale for keeping station observations, trends and Australian TAF conventions separate.
---

Do not reuse Australian TAF change-group duration explanations for METAR/SPECI trends without a separately verified observation-trend decoder. Preserve unsupported trend groups as forecast text, distinct from the observation.

**Why:** Similar group names do not establish identical timing conventions across products and jurisdictions. Applying a TAF explanation to an observation trend can give a false impression of both timing and observed conditions.

**How to apply:** When extending the local reader, validate each product's conventions independently. Keep station scope and UTC observation time explicit; never use surface reports to infer a GPS wind profile or operational clearance.
