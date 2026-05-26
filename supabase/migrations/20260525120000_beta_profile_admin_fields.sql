-- Beta admin fields on existing customer profiles (no new user table).

alter table public.admin_customer_profiles add column if not exists beta_approved boolean not null default false;

create index if not exists admin_customer_profiles_beta_approved_idx
  on public.admin_customer_profiles (beta_approved)
  where beta_approved = true;

notify pgrst, 'reload schema';
