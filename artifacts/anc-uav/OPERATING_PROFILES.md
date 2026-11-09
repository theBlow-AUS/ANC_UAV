# Aviate.Navigate.Communicate (ANC UAV) operating profiles

## Operator reference, not approval

Profiles store operator-entered reference figures. A ReOC/operator label, operation type, manual note, effective-date note or version label is an unverified declaration. The app does not check a ReOC, approve a manual, determine airspace applicability, establish VLOS, or authorise VLOS/EVLOS/BVLOS operations.

The starter reference is deliberately assigned to **Unassigned operator / ReOC**, with custom operation **Reference only**:

| Reference | Starter value |
| --- | --- |
| Maximum height AGL | 120 m |
| Distance from people | 30 m |
| Crewed-aircraft vertical separation | 500 ft |
| Crewed-aircraft horizontal separation | 1,500 m |
| Mini distance from home point | 500 m |
| M30T distance from home point | 1,000 m |
| Matrice 4/5T distance from home point | 800 m |

These are the user's requested starting figures, not independently verified limits. Operation labels never change the numbers automatically. All numeric fields use their displayed fixed units and allow positive decimals up to 100,000; this is a storage/input bound, not a legal limit.

## Saved sets and versions

- Settings manages profiles grouped by operator/ReOC. A profile has a name and separately saved versions. A version contains its operation type, manual/effective notes, all four limits and the complete aircraft list.
- A new profile can start from the starter set or copy a saved version. A new version copies its source but has independent values; editing it does not update older versions.
- ReOC and profile name describe the whole profile, so editing those fields renames or moves all its versions. Version labels must be unique within a profile. The same profile name can exist under different ReOCs.
- Creating or duplicating a version does not activate it. Use an explicit selection to change the complete active set; Aviate identifies that saved selection.
- Aircraft edits within a profile form are drafts until the whole profile version is saved. Cancel leaves the saved set unchanged.
- Removing the active version or its profile clears the selection. The app does not silently choose another version, the latest version, a more permissive set or starter values.
- Restoring defaults is confirmed and scoped to the selected version. It restores the four numeric values and three starter aircraft, and clears its manual/effective notes so restored figures cannot retain misleading source attribution. Identity and operation label remain unchanged and unverified.

## Storage and migration

Profiles, selection and all limits/aircraft are held together in one versioned AsyncStorage document, independently of display/contact preferences, agency content packs, radio assignments and credentials. Writes are queued and the UI only receives a new saved set after the storage write succeeds. A stale edit is rejected rather than overwriting a newer saved revision.

The first load reads the previous aircraft key only if no profile document exists. It copies the entire valid legacy list, including edited values, removed defaults, source notes and intentionally empty lists, into the starter reference. The legacy key is never deleted or overwritten. A damaged legacy list is not partially migrated or replaced by defaults. If reads, validation, migration or the first save fail, editing is blocked and a reload control is shown. A valid existing profile document does not consult legacy data, including after every profile has been deleted.

These records are ordinary local preferences, **not encrypted credential-vault entries**. They are not transmitted to Replit or an app server; no account, subscription or runtime service is needed. Do not place passwords in profile fields. Operating-system backups may include this data; backup exclusion and physical-device restore behaviour have not been verified. There is no profile export/import, cloud recovery or synchronisation in this iteration.

## Verification

`pnpm --filter @workspace/anc-uav run test:profiles` covers exact defaults, migration, corrupt/failed storage, independent ReOCs and versions, explicit activation, stale edits, complete-set persistence, deletion, scoped reset and validation. Existing aircraft tests cover responsive row caps. Browser checks do not replace physical iPhone/iPad tests of keyboards, rotation, Dynamic Type, operating-system termination, storage exhaustion or backup/restore.

The attempted automated browser lifecycle check could not reach ANC UAV because the private development preview required a Replit login. It made no profile changes. The interactive create/edit/switch/delete flow therefore still needs browser or device verification; passing storage-model tests and static previews are not a substitute for that check.
