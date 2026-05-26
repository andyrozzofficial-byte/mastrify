-- Allow server-side issue inserts when using the anon key (app validates beta email on /api/beta/issues).
-- Select remains service_role-only (see insertBetaFeedbackRow / createBetaReportedIssue).

drop policy if exists "beta_reported_issues_insert_anon" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_anon"
  on public.beta_reported_issues
  for insert
  to anon
  with check (true);

drop policy if exists "beta_reported_issues_insert_authenticated" on public.beta_reported_issues;
create policy "beta_reported_issues_insert_authenticated"
  on public.beta_reported_issues
  for insert
  to authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.beta_reported_issues to anon, authenticated;

notify pgrst, 'reload schema';
