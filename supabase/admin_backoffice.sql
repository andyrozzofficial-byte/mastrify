-- Mastrify admin backoffice — run after admin_dashboard.sql

-- Support workflow: Open | Waiting for customer | Resolved | Closed
alter table public.admin_support_inbox add column if not exists priority text;
alter table public.admin_support_inbox add column if not exists resolved_at timestamptz;
alter table public.admin_support_inbox add column if not exists category text;
alter table public.admin_support_inbox add column if not exists session_context jsonb default '{}'::jsonb;
alter table public.admin_support_inbox add column if not exists thread jsonb default '[]'::jsonb;

update public.admin_support_inbox set status = 'open' where status is null or status = 'new';
update public.admin_support_inbox set status = 'waiting_for_customer' where status = 'read';
update public.admin_support_inbox set status = 'resolved' where status = 'resolved';
update public.admin_support_inbox set status = 'closed' where status = 'closed';
update public.admin_support_inbox set priority = 'medium' where priority is null;

alter table public.admin_support_inbox alter column status set default 'open';
alter table public.admin_support_inbox alter column priority set default 'medium';

create index if not exists admin_support_inbox_priority_idx on public.admin_support_inbox (priority);

-- Master jobs (admin view of processing pipeline)
create table if not exists public.admin_master_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  session_id text,
  track_name text,
  user_email text,
  status text not null default 'complete',
  processing_time_ms integer,
  master_lufs numeric,
  mastering_style text,
  error_log text,
  source text not null default 'feedback'
);

create index if not exists admin_master_jobs_created_at_idx on public.admin_master_jobs (created_at desc);
create index if not exists admin_master_jobs_status_idx on public.admin_master_jobs (status);
create index if not exists admin_master_jobs_session_id_idx on public.admin_master_jobs (session_id);

-- Pipeline funnel events (optional ingestion; admin aggregates existing data too)
create table if not exists public.admin_pipeline_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  event_type text not null,
  track_name text,
  user_email text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_pipeline_events_created_at_idx on public.admin_pipeline_events (created_at desc);
create index if not exists admin_pipeline_events_type_idx on public.admin_pipeline_events (event_type);

-- Customer CRM notes
create table if not exists public.admin_customer_profiles (
  email text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  notes text,
  purchased boolean not null default false
);

-- mastered_exports (delivery / download) — create if missing
create table if not exists public.mastered_exports (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  object_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  track_title text,
  amount_cents integer default 900
);

create index if not exists mastered_exports_created_at_idx on public.mastered_exports (created_at desc);

alter table public.admin_master_jobs enable row level security;
alter table public.admin_pipeline_events enable row level security;
alter table public.admin_customer_profiles enable row level security;

drop policy if exists "admin_jobs_service_all" on public.admin_master_jobs;
create policy "admin_jobs_service_all" on public.admin_master_jobs for all to service_role using (true) with check (true);

drop policy if exists "admin_pipeline_service_all" on public.admin_pipeline_events;
create policy "admin_pipeline_service_all" on public.admin_pipeline_events for all to service_role using (true) with check (true);

drop policy if exists "admin_customer_profiles_service_all" on public.admin_customer_profiles;
create policy "admin_customer_profiles_service_all" on public.admin_customer_profiles for all to service_role using (true) with check (true);

drop policy if exists "mastered_exports_service_all" on public.mastered_exports;
create policy "mastered_exports_service_all" on public.mastered_exports for all to service_role using (true) with check (true);

grant all on table public.admin_master_jobs to service_role;
grant all on table public.admin_pipeline_events to service_role;
grant all on table public.admin_customer_profiles to service_role;
grant select on table public.mastered_exports to service_role;

notify pgrst, 'reload schema';
