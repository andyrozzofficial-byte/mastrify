-- Mastrify admin dashboard — run in Supabase SQL Editor after beta_master_feedback.sql

-- Feedback status workflow (see beta_master_feedback_admin_columns.sql)
alter table public.beta_master_feedback add column if not exists status text default 'new';
alter table public.beta_master_feedback add column if not exists admin_notes text;
alter table public.beta_master_feedback add column if not exists updated_at timestamptz default now();
alter table public.beta_master_feedback add column if not exists resolved_at timestamptz;

update public.beta_master_feedback set status = 'new' where status is null;
update public.beta_master_feedback set updated_at = coalesce(created_at, now()) where updated_at is null;

alter table public.beta_master_feedback alter column status set default 'new';
alter table public.beta_master_feedback alter column updated_at set default now();

create table if not exists public.admin_support_inbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  name text,
  subject text,
  message text not null,
  status text not null default 'new',
  source text not null default 'manual',
  admin_notes text
);

create index if not exists admin_support_inbox_created_at_idx
  on public.admin_support_inbox (created_at desc);
create index if not exists admin_support_inbox_status_idx
  on public.admin_support_inbox (status);
create index if not exists admin_support_inbox_email_idx
  on public.admin_support_inbox (email);

create index if not exists beta_master_feedback_status_idx
  on public.beta_master_feedback (status);

alter table public.admin_support_inbox enable row level security;
alter table public.beta_master_feedback enable row level security;

drop policy if exists "beta_feedback_insert_anon" on public.beta_master_feedback;
drop policy if exists "beta_feedback_insert_authenticated" on public.beta_master_feedback;

create policy "beta_feedback_insert_anon"
  on public.beta_master_feedback for insert to anon with check (true);
create policy "beta_feedback_insert_authenticated"
  on public.beta_master_feedback for insert to authenticated with check (true);

drop policy if exists "admin_support_service_all" on public.admin_support_inbox;
create policy "admin_support_service_all"
  on public.admin_support_inbox for all to service_role using (true) with check (true);

drop policy if exists "beta_feedback_service_all" on public.beta_master_feedback;
create policy "beta_feedback_service_all"
  on public.beta_master_feedback for all to service_role using (true) with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.beta_master_feedback to anon, authenticated, service_role;
grant select, update on table public.beta_master_feedback to service_role;
grant all on table public.admin_support_inbox to service_role;

notify pgrst, 'reload schema';
