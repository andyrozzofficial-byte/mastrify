-- Beta Report Issue (public.beta_reported_issues)
-- Run in Supabase Dashboard → SQL Editor if issue submit fails with:
--   "Could not find the table 'public.beta_reported_issues' in the schema cache"
-- Safe to re-run (idempotent).
--
-- Note: `user_id` stores the normalized beta reporter email (Insider email).

create table if not exists public.beta_reported_issues (
  id uuid primary key default gen_random_uuid(),
  action_id text not null unique,
  user_id text not null,
  title text not null,
  description text not null,
  expected_result text,
  screenshot_url text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'fixed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legacy / alternate name (optional column for dashboards; kept in sync with user_id)
alter table public.beta_reported_issues add column if not exists reporter_email text;

update public.beta_reported_issues
set reporter_email = user_id
where reporter_email is null and user_id is not null;

create index if not exists idx_beta_reported_issues_email
  on public.beta_reported_issues (user_id);

create index if not exists beta_reported_issues_user_id_idx
  on public.beta_reported_issues (user_id);

create index if not exists idx_beta_reported_issues_status
  on public.beta_reported_issues (status);

create index if not exists beta_reported_issues_status_idx
  on public.beta_reported_issues (status);

create index if not exists beta_reported_issues_created_at_idx
  on public.beta_reported_issues (created_at desc);

create unique index if not exists beta_reported_issues_action_id_idx
  on public.beta_reported_issues (action_id);

alter table public.beta_reported_issues enable row level security;

-- Service role (admin API + recommended server key)
drop policy if exists "beta_reported_issues_service_all" on public.beta_reported_issues;
create policy "beta_reported_issues_service_all"
  on public.beta_reported_issues
  for all
  to service_role
  using (true)
  with check (true);

-- Anon / authenticated inserts from /api/beta/issues (app validates beta email)
drop policy if exists "beta_reported_issues_insert_anon" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_anon"
  on public.beta_reported_issues
  for insert
  to anon
  with check (true);

drop policy if exists "beta_reported_issues_insert_authenticated" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_authenticated"
  on public.beta_reported_issues
  for insert
  to authenticated
  with check (true);

drop policy if exists "allow issue inserts" on public.beta_reported_issues;
create policy "allow issue inserts"
  on public.beta_reported_issues
  for insert
  with check (true);

drop policy if exists "allow issue reads for admins" on public.beta_reported_issues;
create policy "allow issue reads for admins"
  on public.beta_reported_issues
  for select
  to service_role
  using (true);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.beta_reported_issues to anon, authenticated;
grant all on table public.beta_reported_issues to service_role;

notify pgrst, 'reload schema';
