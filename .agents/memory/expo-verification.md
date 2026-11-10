---
name: Expo verification caveats
description: Lazy preview timing and native-module test doubles can look like application failures.
---

Do not diagnose an empty Expo preview body from a static capture alone when
navigation is visible and lazy route bundles are still loading.

**Why:** In the Expo 58 development preview, static captures completed before
the route content arrived, despite healthy compilation and no application
error. A browser that waited for the actual page content confirmed the app
and its controls worked.

**How to apply:** Check bundling progress and browser errors, then verify the
settled route before changing startup configuration, providers or native-module
guards. Do not keep taking immediate captures of the same loading state.

Native SDK test doubles must match the transpiler's default-export interop;
their failures are not grounds to weaken production credential protection.

**Why:** The current TypeScript CommonJS harness applies default-import
wrapping. An incorrectly shaped mock can falsely report unavailable device
capabilities or preference-storage failures.

**How to apply:** Check emitted interop and mock export shape before changing
native guards. Desktop mocks verify application control flow, not real
Keychain/Keystore security or biometric behaviour.
