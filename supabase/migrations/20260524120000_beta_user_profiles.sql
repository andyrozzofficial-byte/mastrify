-- Extend existing customer profiles for beta login (no duplicate user table).

alter table public.admin_customer_profiles add column if not exists beta_rank text;
alter table public.admin_customer_profiles add column if not exists genre text;
alter table public.admin_customer_profiles add column if not exists daw text;
alter table public.admin_customer_profiles add column if not exists beta_signed_up_at timestamptz;

update public.admin_customer_profiles
set beta_rank = coalesce(beta_rank, 'insider')
where beta_signed_up_at is not null and (beta_rank is null or beta_rank = '');

create index if not exists admin_customer_profiles_beta_signed_up_idx
  on public.admin_customer_profiles (beta_signed_up_at desc nulls last);

notify pgrst, 'reload schema';
