-- Fix schema drift: admin_support_inbox.source referenced by dashboard code.
alter table public.admin_support_inbox add column if not exists source text;
notify pgrst, 'reload schema';

