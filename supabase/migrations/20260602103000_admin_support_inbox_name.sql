-- Fix production schema drift: admin_support_inbox.name referenced by dashboard code.
alter table public.admin_support_inbox add column if not exists name text;

notify pgrst, 'reload schema';

