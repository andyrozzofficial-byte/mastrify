-- Download clicks on mastrify.com/tools for Admin Analytics (Downloads section).
-- Ingested via /api/track/download (service role); not exposed to anon/authenticated clients.
-- Anonymous by design: no visitor id, session id, IP, user agent or country is stored.
--   product: audio_tools | desktop
--   os:      mac | windows
--   plugin:  reference | meter | inspect when the click came from that plugin's own link
--            (still one Audio Tools installer download; the plugin is interest only), otherwise null.

create table if not exists public.admin_site_downloads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product text not null check (product in ('audio_tools', 'desktop')),
  os text not null check (os in ('mac', 'windows')),
  plugin text check (plugin in ('reference', 'meter', 'inspect')),
  constraint admin_site_downloads_plugin_product check (plugin is null or product = 'audio_tools')
);

create index if not exists admin_site_downloads_created_at_idx
  on public.admin_site_downloads (created_at desc);

comment on table public.admin_site_downloads is
  'Anonymous installer download clicks from /tools for Admin Analytics.';

alter table public.admin_site_downloads enable row level security;

revoke all on table public.admin_site_downloads from anon, authenticated;
grant all on table public.admin_site_downloads to service_role;

notify pgrst, 'reload schema';
