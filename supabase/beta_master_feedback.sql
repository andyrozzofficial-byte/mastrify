-- Beta mastering feedback (run in Supabase SQL editor)
create table if not exists public.beta_master_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  responses jsonb not null,
  contact_email text,
  contact_discord text,
  future_beta_contact boolean,
  master_object_key text,
  track_title text,
  session_id text,
  track_name text,
  track_duration numeric,
  mastering_style text,
  stereo_width integer,
  low_end integer
);

-- Migrate existing deployments
alter table public.beta_master_feedback add column if not exists session_id text;
alter table public.beta_master_feedback add column if not exists track_name text;
alter table public.beta_master_feedback add column if not exists track_duration numeric;
alter table public.beta_master_feedback add column if not exists mastering_style text;
alter table public.beta_master_feedback add column if not exists stereo_width integer;
alter table public.beta_master_feedback add column if not exists low_end integer;

create index if not exists beta_master_feedback_created_at_idx
  on public.beta_master_feedback (created_at desc);

create index if not exists beta_master_feedback_session_id_idx
  on public.beta_master_feedback (session_id);

create index if not exists beta_master_feedback_mastering_style_idx
  on public.beta_master_feedback (mastering_style);

-- Allow anon inserts from the app (match your waitlist policy pattern)
alter table public.beta_master_feedback enable row level security;

drop policy if exists "Allow anonymous beta feedback insert" on public.beta_master_feedback;

create policy "Allow anonymous beta feedback insert"
  on public.beta_master_feedback
  for insert
  to anon
  with check (true);
