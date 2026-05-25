-- Beta mastering feedback (run in Supabase SQL editor)
create table if not exists public.beta_master_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  responses jsonb not null,
  contact_email text,
  contact_discord text,
  future_beta_contact boolean,
  master_object_key text,
  track_title text
);

create index if not exists beta_master_feedback_created_at_idx
  on public.beta_master_feedback (created_at desc);

-- Allow anon inserts from the app (match your waitlist policy pattern)
alter table public.beta_master_feedback enable row level security;

create policy "Allow anonymous beta feedback insert"
  on public.beta_master_feedback
  for insert
  to anon
  with check (true);
