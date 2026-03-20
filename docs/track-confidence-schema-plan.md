# Track Confidence Schema Plan

This is the next backend pass for turning the Track card into a reliable planning surface instead of a mix of seeded values and placeholders.

## Why this pass exists

The current Track model is too blunt:

- `pin_data.avg_days` stores one average with no confidence or sample size.
- `pin_data.agency` looks definitive even when it is not verified.
- shortage state is being inferred in the app from report counts, but the database does not store a richer pressure signal.

That means the UI can easily sound more certain than the data really is.

## Goals

1. Keep legacy Track reads working while we backfill stronger data.
2. Separate verified distributor mapping from delivery/supply inference.
3. Store delivery and pressure as explicit, evidence-aware snapshots.
4. Only show distributor information when it has been verified.

## New schema pieces

### `distributors`
Authoritative distributor directory.

Use this for:
- company
- display name
- phone/site
- verification status
- source URL
- last verification time

### `pin_distributor_coverage`
Maps a PIN to one or more candidate distributors.

Use this for:
- exact PIN coverage
- confidence level
- source type
- primary coverage row

This is the key table that lets us stop pretending every PIN already has a certain agency.

### `pin_delivery_confidence`
Stores the derived delivery planning signal.

Use this for:
- sample size over 7d and 30d
- p25 / median / p75 delivery days
- historical fallback average
- confidence level
- freshness
- last observed timestamp

This is what should power `Delivery estimate`.

### `pin_supply_pressure`
Stores the derived shortage / strain signal.

Use this for:
- report count over 7d and 30d
- pressure score
- pressure level
- trend direction
- last report time

This is what should power `Supply pressure`.

### `pin_track_summary_v1`
Compatibility view for frontend reads.

This keeps rollout safe by joining:
- legacy `pin_data`
- delivery confidence snapshot
- supply pressure snapshot
- primary verified distributor

The frontend can move to this view before we drop any old columns.

## Rollout order

### Phase 1. Safe schema add
Run:
- [C:\Users\HP\OneDrive\Documents\AI\CylinderCheck\supabase\sql\2026-03-20_track-confidence-and-distributor-model.sql](C:\Users\HP\OneDrive\Documents\AI\CylinderCheck\supabase\sql\2026-03-20_track-confidence-and-distributor-model.sql)

Do not remove legacy fields yet.

### Phase 2. Backfill snapshots
Build a service-role job or SQL backfill to:
- compute p25 / median / p75 from `reports.delivery_days`
- compute pressure score from recent report counts and trend
- populate `pin_delivery_confidence`
- populate `pin_supply_pressure`

### Phase 3. Distributor verification
Backfill distributor rows from:
- official distributor locators
- manually checked support numbers
- verified city/PIN coverage

Then populate:
- `distributors`
- `pin_distributor_coverage`

### Phase 4. Frontend switch
Update Track reads to use:
- `pin_track_summary_v1`

UI rules:
- show delivery estimate only from confidence snapshot
- show supply pressure only from pressure snapshot
- show distributor only if verification status is `verified`

### Phase 5. Legacy cleanup
Only after successful backfill + frontend migration:
- deprecate `pin_data.agency`
- deprecate `pin_data.avg_days`
- deprecate `pin_data.shortage`
- deprecate `pin_data.trend`

## UI contract after migration

The Track card should read like this:

- `Delivery estimate`
  - summary from p25 / p75 or median
  - note from sample size and freshness

- `Supply pressure`
  - `Limited`, `Low`, `Building`, `Active`, or `Severe`
  - note explaining what that means locally

- `Verified distributor`
  - only when verified
  - otherwise omitted

## Practical recommendation

The safest next coding step after this schema lands is:

1. backfill `pin_delivery_confidence`
2. backfill `pin_supply_pressure`
3. switch Track fetches from `pin_data` + heuristics to `pin_track_summary_v1`
4. only then begin distributor verification work
