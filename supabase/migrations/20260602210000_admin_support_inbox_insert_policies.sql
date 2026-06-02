-- Allow server-side support ticket inserts when using the anon key (validated on /api/support/tickets).
-- Admin list reads still require service_role (see admin_support_service_all policy).

drop policy if exists "admin_support_inbox_insert_anon" on public.admin_support_inbox;
create policy "admin_support_inbox_insert_anon"
  on public.admin_support_inbox
  for insert
  to anon
  with check (true);

drop policy if exists "admin_support_inbox_insert_authenticated" on public.admin_support_inbox;
create policy "admin_support_inbox_insert_authenticated"
  on public.admin_support_inbox
  for insert
  to authenticated
  with check (true);

grant insert on table public.admin_support_inbox to anon, authenticated;

notify pgrst, 'reload schema';
