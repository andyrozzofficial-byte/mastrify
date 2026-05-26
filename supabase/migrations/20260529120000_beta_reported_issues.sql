-- Beta Report Issue flow (replaces heuristic bug-report points from feedback/support).

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

create index if not exists beta_reported_issues_user_id_idx
  on public.beta_reported_issues (user_id);

create index if not exists beta_reported_issues_status_idx
  on public.beta_reported_issues (status);

create index if not exists beta_reported_issues_created_at_idx
  on public.beta_reported_issues (created_at desc);

alter table public.beta_reported_issues enable row level security;

drop policy if exists "beta_reported_issues_service_all" on public.beta_reported_issues;
create policy "beta_reported_issues_service_all"
  on public.beta_reported_issues
  for all
  to service_role
  using (true)
  with check (true);

grant all on table public.beta_reported_issues to service_role;

notify pgrst, 'reload schema';
