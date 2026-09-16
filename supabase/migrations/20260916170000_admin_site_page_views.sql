-- First-party website traffic pageviews for Admin Analytics.
-- Ingested via /api/track/pageview (service role); not exposed to anon/authenticated clients.

create table if not exists public.admin_site_page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text not null,
  path text not null,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text not null default 'desktop',
  country text,
  is_new_visitor boolean not null default false
);

create index if not exists admin_site_page_views_created_at_idx
  on public.admin_site_page_views (created_at desc);

create index if not exists admin_site_page_views_visitor_id_idx
  on public.admin_site_page_views (visitor_id);

create index if not exists admin_site_page_views_session_id_idx
  on public.admin_site_page_views (session_id);

create index if not exists admin_site_page_views_path_idx
  on public.admin_site_page_views (path);

comment on table public.admin_site_page_views is
  'First-party website traffic pageviews for Admin Analytics.';

alter table public.admin_site_page_views enable row level security;

revoke all on table public.admin_site_page_views from anon, authenticated;
grant all on table public.admin_site_page_views to service_role;

notify pgrst, 'reload schema';
