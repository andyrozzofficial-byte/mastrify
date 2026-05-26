-- Ensure admin_customer_profiles exists before beta column migrations (idempotent).

create table if not exists public.admin_customer_profiles (
  email text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  notes text,
  purchased boolean not null default false,
  beta_rank text,
  genre text,
  daw text,
  beta_signed_up_at timestamptz,
  beta_approved boolean not null default false
);

alter table public.admin_customer_profiles add column if not exists name text;
alter table public.admin_customer_profiles add column if not exists notes text;
alter table public.admin_customer_profiles add column if not exists purchased boolean not null default false;
alter table public.admin_customer_profiles add column if not exists beta_rank text;
alter table public.admin_customer_profiles add column if not exists genre text;
alter table public.admin_customer_profiles add column if not exists daw text;
alter table public.admin_customer_profiles add column if not exists beta_signed_up_at timestamptz;
alter table public.admin_customer_profiles add column if not exists beta_approved boolean not null default false;

update public.admin_customer_profiles
set beta_rank = coalesce(beta_rank, 'insider')
where beta_signed_up_at is not null and (beta_rank is null or beta_rank = '');

create index if not exists admin_customer_profiles_beta_signed_up_idx
  on public.admin_customer_profiles (beta_signed_up_at desc nulls last);

create index if not exists admin_customer_profiles_beta_approved_idx
  on public.admin_customer_profiles (beta_approved)
  where beta_approved = true;

alter table public.admin_customer_profiles enable row level security;

drop policy if exists "admin_customer_profiles_service_all" on public.admin_customer_profiles;
create policy "admin_customer_profiles_service_all"
  on public.admin_customer_profiles
  for all
  to service_role
  using (true)
  with check (true);

grant all on table public.admin_customer_profiles to service_role;

notify pgrst, 'reload schema';
