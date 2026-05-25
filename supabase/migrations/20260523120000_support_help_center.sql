-- Help center / support tickets: category, session context, threaded replies
alter table public.admin_support_inbox add column if not exists category text;
alter table public.admin_support_inbox add column if not exists session_context jsonb default '{}'::jsonb;
alter table public.admin_support_inbox add column if not exists thread jsonb default '[]'::jsonb;

update public.admin_support_inbox set session_context = '{}'::jsonb where session_context is null;
update public.admin_support_inbox set thread = '[]'::jsonb where thread is null;

create index if not exists admin_support_inbox_category_idx on public.admin_support_inbox (category);

notify pgrst, 'reload schema';
