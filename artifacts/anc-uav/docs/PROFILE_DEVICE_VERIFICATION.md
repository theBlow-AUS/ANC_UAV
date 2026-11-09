# Operating-profile device verification record

Scope: operating profiles only (ReOC/profile/version lifecycle, aircraft kit, active selection). Saved-reference imports and community radio updates are covered elsewhere.

## Status (2026-11-09)

| Area | Status |
| --- | --- |
| Injected-storage model tests (`pnpm --filter @workspace/anc-uav run test:profiles`, 17 tests) | Passed |
| Physical iPhone/iPad checks (below) | **User reports success on iPhone 17 Pro, iOS 27.2.** Build number and individual checks were not itemized; this is user-reported, not independently observed here. |
| Authorised browser preview checks (below) | **User confirms all passed.** Browser/build details and individual checks were not itemized; this is user-reported, not independently observed here. |

Device and browser results are user-reported. Do not infer specific checklist coverage or test results beyond those confirmations. The earlier automated preview attempt was login-blocked; no preview access was changed. Add build and per-check results if they become available.

## Rules for every run

- Use a test device/simulator or a fresh install, never an operator's real settings. If real profiles exist, export them first and use a separate install.
- Use synthetic data only, e.g. ReOC `TEST-0001`, profile `Synthetic A`, versions `v1`, `v2`. Do not enter real ReOC numbers.

## Checklist

For each item record device, iOS version, build, date, tester, pass/fail.

1. **Lifecycle**: create profile; stage an aircraft edit then Cancel (saved values unchanged); invalid number shows field errors and saves nothing; Save; create a second version (independent values); edit one, confirm the other is unchanged.
2. **Activation/relaunch**: saving does not activate; explicit select activates; force-quit and relaunch keeps the selection and values.
3. **Scoped reset**: restore defaults on one version only; other versions, identity and selection unchanged.
4. **Deletion**: delete the active version: selection clears, no fallback; delete the final profile: starter set does not reappear after relaunch.
5. **Keyboard focus**: next/previous field navigation, no field hidden behind keyboard, dismiss and return keep draft; external keyboard Tab order.
6. **Dynamic Type**: largest and accessibility sizes: no clipped buttons/labels, forms scroll, actions reachable.
7. **Layout**: iPhone and iPad, portrait and landscape, rotating mid-edit keeps the draft; list row caps (50 versions per profile, 100 profiles) show the limit message, not a crash.
8. **Interruptions**: force-quit during Save and during first-launch migration from the legacy aircraft key (use a build that has legacy data); expect either the old or new complete document, legacy key retained, no starter shown on failed migration, reload control works.
9. **Storage exhaustion**: fill device storage on a test device, attempt Save/Select/Delete; expect the error message, unchanged saved data, draft still in the form.
10. **OS termination / backup-restore**: background memory pressure termination mid-edit (draft loss is acceptable, saved data must be intact); restore a device backup to another test device and confirm profiles load or show the blocked-read message without overwriting. Backup behaviour is unverified until done.

## Code-review notes (not a substitute for the above)

- `lib/profile-store.ts` commits a single JSON blob with one `setItem`; state is published only after the write resolves, and the legacy key is never deleted. This design means an interrupted write yields the prior or new whole document, assuming the AsyncStorage native write is atomic, which has not been confirmed on device.
- A draft is held only in component state, so OS termination discards unsaved form edits by design.
