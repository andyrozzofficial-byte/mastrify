# Database constraints audit (beta metrics)

| Table | Constraint | Purpose |
|-------|------------|---------|
| `beta_master_completions` | `session_id` PRIMARY KEY | **Canonical** completed masters (one per workflow session) |
| `admin_master_jobs` | Unique `session_id` (partial) | Admin jobs mirror; idempotent upsert from completion |
| `mastered_exports` | Unique `(email, object_key)` | Download / delivery dedupe |
| `beta_master_feedback` | Unique `session_id` (partial) | One feedback row per mastering session |
| `beta_reported_issues` | Unique `action_id` (partial) | One issue per client submit (`actionId` UUID) |
| `admin_pipeline_events` | Unique `(event_type, session_id, user_email)` for `master_complete` / `download` | Enrichment only; prevents pipeline inflation |

Migration: `migrations/20260602200000_constraints_audit.sql`

## Duplication policy

- **Masters**: Count only `beta_master_completions`. Retries return `alreadyCounted`; no extra KPI.
- **Downloads**: `mastered_exports` + pre-insert check; unique on `(email, object_key)`.
- **Feedback**: One row per `session_id`; API returns `alreadyCounted` when present.
- **Issues**: One row per `action_id`; API returns `alreadyCounted` when present.

## Concurrency (application)

- Client: `lib/betaClientInFlight.ts` coalesces in-flight complete/download calls; `betaTrackingStorage` blocks repeat complete per tab session.
- Server: Pre-check + insert conflict handling in `recordBetaMasterCompletion`, `recordBetaMasterDownload`, feedback routes, `createBetaReportedIssue`.
