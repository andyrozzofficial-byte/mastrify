-- Idempotent ensure for beta_reported_issues (supabase db push).
-- Manual apply: paste supabase/beta_reported_issues.sql in SQL Editor.

create table if not exists public.beta_reported_issues (
  id uuid primary key default gen_random_uuid(),
  reporter_email text,
  title text not null,
  description text not null,
  expected_result text,
  priority text not null default 'medium',
  screenshot_url text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.beta_reported_issues add column if not exists action_id text;
alter table public.beta_reported_issues add column if not exists user_id text;
alter table public.beta_reported_issues add column if not exists updated_at timestamptz not null default now();

update public.beta_reported_issues
set reporter_email = user_id
where (reporter_email is null or reporter_email = '') and user_id is not null;

update public.beta_reported_issues
set user_id = reporter_email
where (user_id is null or user_id = '') and reporter_email is not null;

create index if not exists idx_beta_reported_issues_email
  on public.beta_reported_issues (reporter_email);

create index if not exists idx_beta_reported_issues_status
  on public.beta_reported_issues (status);

create index if not exists beta_reported_issues_created_at_idx
  on public.beta_reported_issues (created_at desc);

create unique index if not exists beta_reported_issues_action_id_key
  on public.beta_reported_issues (action_id)
  where action_id is not null and action_id <> '';

alter table public.beta_reported_issues enable row level security;

drop policy if exists "beta_reported_issues_service_all" on public.beta_reported_issues;
create policy "beta_reported_issues_service_all"
  on public.beta_reported_issues
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "allow issue inserts" on public.beta_reported_issues;
create policy "allow issue inserts"
  on public.beta_reported_issues
  for insert
  with check (true);

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

drop policy if exists "allow issue reads for admins" on public.beta_reported_issues;
create policy "allow issue reads for admins"
  on public.beta_reported_issues
  for select
  to service_role
  using (true);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.beta_reported_issues to anon, authenticated;
grant select, update, delete on table public.beta_reported_issues to service_role;

notify pgrst, 'reload schema';
