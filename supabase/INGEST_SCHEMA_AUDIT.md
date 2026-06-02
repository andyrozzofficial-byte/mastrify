# Ingest schema audit (code vs migrations)

Compared **2026-06-02** — production errors indicate migrations were not fully applied.

## `admin_support_inbox`

| Column | Base (`admin_dashboard.sql`) | Code expects | Migration adds |
|--------|------------------------------|--------------|----------------|
| id, created_at, updated_at, email, message, status, source | yes | yes | — |
| name | yes (create) | yes | `20260602103000` |
| subject, admin_notes | yes | yes | — |
| category | **no** | yes (submit + admin SELECT) | `20260523120000`, `20260602114900` |
| priority, resolved_at | **no** | yes | `20260519120000`, `admin_backoffice.sql` |
| session_context, thread | **no** | yes | `20260523120000` |

**Production error:** `admin_support_inbox.category does not exist` → DB is on base dashboard schema only.

## `beta_reported_issues`

Conflicting `create table if not exists` migrations:

| Migration | Creates table with |
|-----------|-------------------|
| `20260529120000` | `user_id` NOT NULL, no `reporter_email`, no `session_id` |
| `20260531120000` | `reporter_email`, no `session_id` |
| `20260602114200` | includes `session_id` but **skipped** if table already exists |

**Code SELECT** (`lib/betaIssues.ts`): includes `session_id`, `reporter_email`.

**Production errors:** table missing OR `session_id` does not exist.

## Repair

Apply **`migrations/20260602230000_production_ingest_schema_repair.sql`** (idempotent).

Manual fallback: run `supabase/beta_reported_issues.sql` then support columns from `20260523120000_support_help_center.sql` in SQL Editor.
