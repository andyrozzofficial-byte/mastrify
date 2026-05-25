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

**Feedback API (`/api/beta-feedback`):** uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`) for inserts. Anon can **insert** but not **select** rows — the API must not call `.select()` after insert unless `SUPABASE_SERVICE_ROLE_KEY` is set (optional, for returning `id`).

Recommended `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Optional — admin dashboard + insert returning id:
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Beta feedback (optional): `ENABLE_BETA_FEEDBACK=true` on Vercel is mirrored to the client at build via `next.config.ts`.

## Admin dashboard

Routes (internal only):

- `/admin` — overview
- `/admin/feedback` — feedback management (status: new / read / resolved)
- `/admin/support` — support inbox
- `/admin/customers` — customer history by email
- `/admin/analytics` — charts and trends

Run [`admin_dashboard.sql`](./admin_dashboard.sql) after `beta_master_feedback.sql` (adds `status`, `admin_support_inbox` table).

Legacy `/admin/beta-feedback` redirects to `/admin/feedback`.

Requires `MASTRIFY_ADMIN_PASSWORD` (or `MASTRIFY_ACCESS_PASSWORD`) and `SUPABASE_SERVICE_ROLE_KEY` for reading all rows server-side.
