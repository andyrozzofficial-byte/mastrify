-- Real completed masters (deduped by session_id). Not counted on "Start mastering".

create table if not exists public.beta_master_completions (
  session_id text primary key,
  email text not null,
  track_name text,
  mastering_style text,
  processing_time_ms integer,
  master_lufs numeric,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists beta_master_completions_email_idx
  on public.beta_master_completions (email);

create index if not exists beta_master_completions_completed_at_idx
  on public.beta_master_completions (completed_at desc);

alter table public.beta_master_completions enable row level security;

drop policy if exists "beta_master_completions_service_all" on public.beta_master_completions;
create policy "beta_master_completions_service_all"
  on public.beta_master_completions
  for all
  to service_role
  using (true)
  with check (true);

grant all on table public.beta_master_completions to service_role;
