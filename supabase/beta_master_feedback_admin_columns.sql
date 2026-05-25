-- Safe admin columns for public.beta_master_feedback
-- Run in Supabase SQL Editor after beta_master_feedback.sql (or if admin dashboard queries fail on missing status)

alter table public.beta_master_feedback add column if not exists status text default 'new';
alter table public.beta_master_feedback add column if not exists admin_notes text;
alter table public.beta_master_feedback add column if not exists updated_at timestamptz default now();
alter table public.beta_master_feedback add column if not exists resolved_at timestamptz;

update public.beta_master_feedback set status = 'new' where status is null;
update public.beta_master_feedback set updated_at = coalesce(created_at, now()) where updated_at is null;

alter table public.beta_master_feedback alter column status set default 'new';
alter table public.beta_master_feedback alter column updated_at set default now();

create index if not exists beta_master_feedback_status_idx on public.beta_master_feedback (status);

grant select, update on table public.beta_master_feedback to service_role;

notify pgrst, 'reload schema';
