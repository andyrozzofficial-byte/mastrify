-- Production repair: align admin_support_inbox + beta_reported_issues with app code.
-- Idempotent. Safe to run in SQL Editor if `supabase db push` is behind.

-- ─── admin_support_inbox ───────────────────────────────────────────────────

create table if not exists public.admin_support_inbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  name text,
  subject text,
  message text not null,
  status text not null default 'open',
  source text not null default 'manual',
  admin_notes text
);

alter table public.admin_support_inbox add column if not exists name text;
alter table public.admin_support_inbox add column if not exists subject text;
alter table public.admin_support_inbox add column if not exists source text default 'manual';
alter table public.admin_support_inbox add column if not exists admin_notes text;
alter table public.admin_support_inbox add column if not exists priority text default 'medium';
alter table public.admin_support_inbox add column if not exists resolved_at timestamptz;
alter table public.admin_support_inbox add column if not exists category text;
alter table public.admin_support_inbox add column if not exists session_context jsonb default '{}'::jsonb;
alter table public.admin_support_inbox add column if not exists thread jsonb default '[]'::jsonb;

update public.admin_support_inbox set status = 'open' where status is null or status = 'new';
update public.admin_support_inbox set status = 'waiting_for_customer' where status = 'read';
update public.admin_support_inbox set priority = 'medium' where priority is null;
update public.admin_support_inbox set session_context = '{}'::jsonb where session_context is null;
update public.admin_support_inbox set thread = '[]'::jsonb where thread is null;
update public.admin_support_inbox set source = 'manual' where source is null;

alter table public.admin_support_inbox enable row level security;

drop policy if exists "admin_support_service_all" on public.admin_support_inbox;
create policy "admin_support_service_all"
  on public.admin_support_inbox for all to service_role using (true) with check (true);

drop policy if exists "admin_support_inbox_insert_anon" on public.admin_support_inbox;
create policy "admin_support_inbox_insert_anon"
  on public.admin_support_inbox for insert to anon with check (true);

drop policy if exists "admin_support_inbox_insert_authenticated" on public.admin_support_inbox;
create policy "admin_support_inbox_insert_authenticated"
  on public.admin_support_inbox for insert to authenticated with check (true);

grant all on table public.admin_support_inbox to service_role;
grant insert on table public.admin_support_inbox to anon, authenticated;

create index if not exists admin_support_inbox_created_at_idx on public.admin_support_inbox (created_at desc);
create index if not exists admin_support_inbox_email_idx on public.admin_support_inbox (email);
create index if not exists admin_support_inbox_category_idx on public.admin_support_inbox (category);

-- ─── beta_reported_issues ──────────────────────────────────────────────────

create table if not exists public.beta_reported_issues (
  id uuid primary key default gen_random_uuid(),
  reporter_email text,
  user_id text,
  action_id text,
  title text not null,
  description text not null,
  expected_result text,
  screenshot_url text,
  priority text not null default 'medium',
  status text not null default 'open',
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.beta_reported_issues add column if not exists reporter_email text;
alter table public.beta_reported_issues add column if not exists user_id text;
alter table public.beta_reported_issues add column if not exists action_id text;
alter table public.beta_reported_issues add column if not exists expected_result text;
alter table public.beta_reported_issues add column if not exists screenshot_url text;
alter table public.beta_reported_issues add column if not exists priority text default 'medium';
alter table public.beta_reported_issues add column if not exists status text default 'open';
alter table public.beta_reported_issues add column if not exists session_id text;
alter table public.beta_reported_issues add column if not exists updated_at timestamptz default now();

update public.beta_reported_issues
set reporter_email = user_id
where (reporter_email is null or reporter_email = '') and user_id is not null;

update public.beta_reported_issues
set user_id = reporter_email
where (user_id is null or user_id = '') and reporter_email is not null;

update public.beta_reported_issues set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
update public.beta_reported_issues set priority = 'medium' where priority is null;
update public.beta_reported_issues set status = 'open' where status is null;

alter table public.beta_reported_issues enable row level security;

drop policy if exists "beta_reported_issues_service_all" on public.beta_reported_issues;
create policy "beta_reported_issues_service_all"
  on public.beta_reported_issues for all to service_role using (true) with check (true);

drop policy if exists "beta_reported_issues_insert_anon" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_anon"
  on public.beta_reported_issues for insert to anon with check (true);

drop policy if exists "beta_reported_issues_insert_authenticated" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_authenticated"
  on public.beta_reported_issues for insert to authenticated with check (true);

grant all on table public.beta_reported_issues to service_role;
grant insert on table public.beta_reported_issues to anon, authenticated;

create index if not exists idx_beta_reported_issues_email on public.beta_reported_issues (reporter_email);
create index if not exists idx_beta_reported_issues_status on public.beta_reported_issues (status);
create index if not exists beta_reported_issues_created_at_idx on public.beta_reported_issues (created_at desc);
create index if not exists beta_reported_issues_session_id_idx on public.beta_reported_issues (session_id);

create unique index if not exists beta_reported_issues_action_id_key
  on public.beta_reported_issues (action_id)
  where action_id is not null and action_id <> '';

notify pgrst, 'reload schema';
