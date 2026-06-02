-- Fix schema drift: admin_support_inbox.category referenced by support UI.
alter table public.admin_support_inbox add column if not exists category text;
notify pgrst, 'reload schema';

