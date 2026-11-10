# GPS weather physical-device verification

## Status

User-reported acceptance passed for the full physical-device checklist below.
After being asked specifically about iPhone landscape, iPad in both orientations,
permission recovery, consent revocation, offline storage, failure/clear behavior,
missing fields, age/current-hour handling, direct rounded requests and background
cancellation, the user replied: “All - works brilliantly - thankyou”.

This is user-performed verification, not an independently instrumented native
test run by the agent. The agent reviewed the three supplied portrait screenshots.
No network trace, build identifier, runtime identification, iPad model/OS or
per-case recordings were supplied; do not infer these details or claim that
screenshots alone prove native storage or network behavior.

## Supplied evidence

On 10 November 2026, the user reported that weather “worked as expected” on an
iPhone 17 Pro running iOS 27.2 and supplied three portrait screenshots.
Device model and OS version are user-reported; the screenshots do not identify
the app build or whether it runs in Expo Go, a standalone app, or a browser.

The screenshots show:

- The non-commercial coordinate-sharing checkbox selected, with the disclosure,
  GPS request action, source/licence links and clear action visible.
- A populated forecast with a rounded requested-area display, model-grid
  distinction, retrieval-age label and UTC forecast-valid time.
- Wind at 10, 80 and 120 m, a separate 10 m gust field, precipitation and other
  surface fields, upcoming UTC hours, attribution and safety limitations.
- Readable weather content across three scroll positions in portrait.

This supports the reported successful iPhone display/retrieval flow. It does
not establish what coordinates were transmitted, storage persistence, permission
handling, background behavior, or the operation of controls merely shown.
No location values from the supplied images are reproduced here.

## Acceptance checklist and reported results

The final confirmation covers the following checks collectively; individual
observations were not supplied. For future repeat runs, record the build/runtime,
device model, OS, orientation, action and observed outcome for each check.
Use a test device; clearing weather deliberately removes its saved forecast
and consent.

| Check | Expected result | Evidence status |
| --- | --- | --- |
| Runtime/build identification | Identify the tested build and native runtime; browser behavior is not native evidence. | Not supplied |
| iPhone portrait and landscape; iPad portrait and landscape | Controls, disclosures, current-hour values and missing-data messages remain readable and reachable. | User-reported pass; iPhone portrait screenshots reviewed |
| Denied GPS permission | No weather request; readable denial message; previous forecast retained. | User-reported pass |
| Settings recovery | After location is enabled in Settings, an explicit weather action succeeds without reinstalling. | User-reported pass |
| Consent and revocation | No retrieval without confirmation; revocation survives relaunch and disables retrieval until accepted again. | User-reported pass; selected state visible |
| Direct rounded requests | Device network inspection shows weather requests directly to `api.open-meteo.com`, with coordinates rounded to 0.001° and no raw GPS fix or accuracy sent. Do not publish captured location/IP values. | User-reported pass; rounded display visible; no network trace supplied |
| Launch, resume and background privacy | No automatic weather requests on launch, resume or while backgrounded; backgrounding an in-flight refresh cancels it without replacing the saved forecast. | User-reported pass; no diagnostic trace supplied |
| Offline last-area forecast | Following a successful save, force-close and relaunch offline; last requested area and forecast remain available without a new GPS request. | User-reported pass |
| Missing 120 m fields | A controlled missing-field response displays “not supplied”, not zero or substituted lower-height data. Do not change the production provider endpoint. | User-reported pass |
| Age/current-hour handling | A forecast older than three hours is warned about; missing present-hour coverage is not replaced by a past hour. | User-reported pass; fresh labels visible |
| Failed refresh | An actual attempted refresh that fails retains the previous saved forecast, including after relaunch. Account for the 30-minute same-area request suppression. | User-reported pass |
| Clear saved weather/consent | Clear removes both; offline relaunch shows no saved forecast and unchecked consent, without affecting other saved references. | User-reported pass; clear action visible |

Do not enable commercial use of the free endpoint or any permission-gated
provider to perform these checks.
