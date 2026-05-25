# Supabase schema

## Beta feedback (`public.beta_master_feedback`)

If feedback submission fails with **“Could not find the table … in the schema cache”**:

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/wyuxkmrnzqvlqshlqfiw/sql/new).
2. Paste and run the full contents of [`beta_master_feedback.sql`](./beta_master_feedback.sql).
3. Wait ~10 seconds (the script ends with `NOTIFY pgrst, 'reload schema';`).

Verify locally:

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY or valid anon key in .env.local
npm run db:beta-feedback:check
```

Apply via `psql` when you have a DB URL:

```bash
# Set SUPABASE_DB_URL or DATABASE_URL in .env.local, then:
npm run db:beta-feedback
```

Or with Supabase CLI: `supabase db push` (uses `migrations/20260520120000_beta_master_feedback.sql`).

### Server env (Vercel / `.env.local`)

- `SUPABASE_URL` — project URL
- `SUPABASE_SERVICE_ROLE_KEY` — recommended for `/api/beta-feedback` inserts (bypasses RLS issues during setup)

Anonymous users can still submit via RLS insert policies once the table exists.

## Admin analytics dashboard

Route: `/admin/beta-feedback` (internal only).

Requires `MASTRIFY_ADMIN_PASSWORD` (or `MASTRIFY_ACCESS_PASSWORD`) and `SUPABASE_SERVICE_ROLE_KEY` for reading all rows server-side.
