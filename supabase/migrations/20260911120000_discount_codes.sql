-- Promo / discount codes for master export checkout
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent_off integer not null check (percent_off >= 0 and percent_off <= 100),
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_code_unique unique (code)
);

create index if not exists discount_codes_active_idx on public.discount_codes (active);
create index if not exists discount_codes_code_idx on public.discount_codes (code);

create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.discount_codes (id) on delete restrict,
  code text not null,
  object_key text not null,
  percent_off integer not null,
  final_amount_cents integer not null default 0,
  stripe_session_id text,
  free_order_id text,
  email text,
  created_at timestamptz not null default now(),
  constraint discount_redemptions_stripe_session_unique unique (stripe_session_id),
  constraint discount_redemptions_free_order_unique unique (free_order_id),
  constraint discount_redemptions_code_object_unique unique (code_id, object_key)
);

create index if not exists discount_redemptions_code_id_idx on public.discount_redemptions (code_id);
create index if not exists discount_redemptions_object_key_idx on public.discount_redemptions (object_key);

notify pgrst, 'reload schema';
