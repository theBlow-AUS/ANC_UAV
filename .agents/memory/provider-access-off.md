---
name: Provider Access disabled
description: User decision to turn off the ANC UAV Provider Access feature.
---

Provider Access, provider connections, downloads, credential access, and vault-management controls are turned off. Existing credentials saved in device secure storage are retained and must not be accessed or deleted as part of this decision.

**Why:** the user asked to turn off Provider Access.

**How to apply:** keep its entry points removed and its direct route in a disabled state. Re-enable only if the user explicitly asks; do not delete existing vault entries without a separate request.

The user subsequently authorized an OpenAIP-specific optional personal API key
alongside default public offline downloads. This is a narrow exception, not a
request to restore general Provider Access or Airservices/NAIPS/CASA credential
management.

**Why:** The user explicitly selected this hybrid OpenAIP integration.

**How to apply:** Isolate any OpenAIP-only key controls and secure-storage
namespace. Leave existing provider routes disabled and their stored entries
untouched.
