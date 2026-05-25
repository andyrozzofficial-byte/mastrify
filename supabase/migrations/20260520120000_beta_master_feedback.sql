-- Supabase CLI: supabase db push / supabase migration up
-- (Identical to supabase/beta_master_feedback.sql)

create table if not exists public.beta_master_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  track_name text,
  track_duration numeric,
  mastering_style text,
  stereo_width integer,
  low_end integer,
  master_lufs numeric,
  processing_time_ms integer,
  responses jsonb not null default '{}'::jsonb,
  contact_email text,
  contact_discord text,
  future_beta_contact boolean,
  master_object_key text,
  track_title text
);

alter table public.beta_master_feedback add column if not exists session_id text;
alter table public.beta_master_feedback add column if not exists track_name text;
alter table public.beta_master_feedback add column if not exists track_duration numeric;
alter table public.beta_master_feedback add column if not exists mastering_style text;
alter table public.beta_master_feedback add column if not exists stereo_width integer;
alter table public.beta_master_feedback add column if not exists low_end integer;
alter table public.beta_master_feedback add column if not exists master_lufs numeric;
alter table public.beta_master_feedback add column if not exists processing_time_ms integer;
alter table public.beta_master_feedback add column if not exists responses jsonb;
alter table public.beta_master_feedback add column if not exists contact_email text;
alter table public.beta_master_feedback add column if not exists contact_discord text;
alter table public.beta_master_feedback add column if not exists future_beta_contact boolean;
alter table public.beta_master_feedback add column if not exists master_object_key text;
alter table public.beta_master_feedback add column if not exists track_title text;
alter table public.beta_master_feedback add column if not exists created_at timestamptz;

update public.beta_master_feedback set responses = '{}'::jsonb where responses is null;

alter table public.beta_master_feedback alter column responses set default '{}'::jsonb;
alter table public.beta_master_feedback alter column created_at set default now();

create index if not exists beta_master_feedback_created_at_idx on public.beta_master_feedback (created_at desc);
create index if not exists beta_master_feedback_session_id_idx on public.beta_master_feedback (session_id);
create index if not exists beta_master_feedback_mastering_style_idx on public.beta_master_feedback (mastering_style);

alter table public.beta_master_feedback enable row level security;

drop policy if exists "beta_feedback_insert_anon" on public.beta_master_feedback;
drop policy if exists "beta_feedback_insert_authenticated" on public.beta_master_feedback;
drop policy if exists "Allow anonymous beta feedback insert" on public.beta_master_feedback;

create policy "beta_feedback_insert_anon" on public.beta_master_feedback for insert to anon with check (true);
create policy "beta_feedback_insert_authenticated" on public.beta_master_feedback for insert to authenticated with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.beta_master_feedback to anon, authenticated, service_role;
grant select on table public.beta_master_feedback to service_role;

notify pgrst, 'reload schema';
