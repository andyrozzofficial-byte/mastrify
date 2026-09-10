-- Align existing Supabase schema with admin panel (447bb12).
-- Safe/idempotent: ADD COLUMN IF NOT EXISTS only; no data deletion.

-- admin_support_inbox: help-center + admin UI columns
alter table public.admin_support_inbox add column if not exists name text;
alter table public.admin_support_inbox add column if not exists source text;
alter table public.admin_support_inbox add column if not exists category text;
alter table public.admin_support_inbox add column if not exists session_context jsonb default '{}'::jsonb;
alter table public.admin_support_inbox add column if not exists thread jsonb default '[]'::jsonb;

update public.admin_support_inbox set source = 'manual' where source is null;
update public.admin_support_inbox set category = 'general' where category is null;
update public.admin_support_inbox set session_context = '{}'::jsonb where session_context is null;
update public.admin_support_inbox set thread = '[]'::jsonb where thread is null;

create index if not exists admin_support_inbox_category_idx on public.admin_support_inbox (category);

-- beta_reported_issues: admin list filter + detail
alter table public.beta_reported_issues add column if not exists session_id text;

create index if not exists beta_reported_issues_session_id_idx
  on public.beta_reported_issues (session_id)
  where session_id is not null;

notify pgrst, 'reload schema';
