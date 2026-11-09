# Community radio snapshot: physical-device validation

## Environment status

No physical iPhone or iPad was available during this engineering validation.
Accordingly, no claims are made about real-device airplane mode, iOS/iPadOS
background suspension or termination, native networking, permission dialogs,
layout, accessibility text scaling, or device storage behavior. Complete this
checklist on physical devices before release.

This checklist covers the explicit OurAirports community radio snapshot update
in Radio lookup only. It does not cover the separate saved-reference import
flow.

## Automated checks completed

`pnpm --filter @workspace/anc-uav test:community` passes synthetic engineering
tests for:

- bundled data lookup and no automatic network request on startup;
- reuse of a saved snapshot when offline and after creating a fresh store;
- interrupted, malformed, incomplete, rate-limited, and failed-storage updates
  retaining the last usable snapshot and returning failure;
- unread saved data being protected from update until it can be reloaded;
- bounded responses, pinned GitHub hosts/revision, and omitted credentials.

These tests use synthetic fixtures and mocked storage/network responses. They
do not substitute for device testing. The typecheck did not complete because
the workspace could not resolve the already-declared `fflate` package from
`artifacts/anc-uav/data/openaip-pack.ts`.

## Release checklist: iPhone and iPad

Record OS version, app build, device model, orientation, text-size setting, and
result for each run. Start from a known bundled snapshot; when testing an
updated snapshot, record its displayed revision and retrieval time.

1. **First launch offline:** Clear app data, enable airplane mode, open Radio
   lookup, and search a known bundled aerodrome. Confirm the bundled result is
   immediately searchable and no update is attempted.
2. **Direct device update / native networking:** Restore connectivity and
   explicitly start an update. Confirm GitHub requests succeed from the
   device without a browser CORS failure, account sign-in, location permission,
   Replit service, or automatic request. Confirm both CSVs use one revision.
3. **Saved cache after restart:** Complete an update, force-quit, relaunch, and
   verify the same revision and results load offline.
4. **Location permission denial / manual origin:** Deny location access.
   Confirm name/identifier search still works, no distance is claimed without
   an origin, and valid manually entered coordinates set an origin. Invalid
   coordinates must leave the existing origin unchanged.
5. **Phone and tablet layout:** Check portrait and landscape on both iPhone and
   iPad. Check default and largest supported system text sizes. Confirm update
   disclosure, action buttons, manual coordinate fields, errors, and result
   details remain reachable without clipping or horizontal scrolling.
6. **Network interruption:** Interrupt connectivity during revision lookup and
   during each CSV download. Confirm the update reports failure, leaves the
   previous revision active, and that snapshot remains searchable.
7. **Background and termination:** Background the app during each update stage;
   separately force-quit or terminate it during transfer and while saving.
   Reopen online and offline. Confirm either the old committed snapshot or a
   fully validated new snapshot is usable; never accept a partial replacement
   or a success message for a failed update.
8. **Rate limiting:** Exercise or safely simulate GitHub HTTP 429. Confirm the
   failure is visible, the active and persisted snapshot remain unchanged, and
   a later successful manual retry works.
9. **Storage full and read errors:** With a controlled test device or test
   harness, simulate a failed write and a failed/corrupt read. Confirm errors
   are visible, no update is reported as successful, the active last-known-good
   snapshot remains searchable, and updates remain blocked while saved data
   cannot be read. Verify recovery after storage becomes readable again.

## Current verification boundary

The source uses Expo's native `expo/fetch` transport, restricts requests to
GitHub's API and raw-content hosts, omits credentials, and only downloads after
the user presses the update button. Browser CORS behavior is not established
by the native-device tests above; validate any supported web preview separately
if web access is part of the release. The physical-device checks above remain
open until executed and recorded.
