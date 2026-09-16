-- Secure promo-code tables: server/service-role only (no public PostgREST access).
-- All app access goes through Next.js API routes and Railway backend using SUPABASE_SERVICE_ROLE_KEY.

alter table public.discount_codes enable row level security;
alter table public.discount_redemptions enable row level security;

-- Defense in depth: remove direct API roles (RLS alone blocks anon when no policies exist).
revoke all on table public.discount_codes from anon, authenticated;
revoke all on table public.discount_redemptions from anon, authenticated;

-- Service role bypasses RLS in Supabase; grant keeps PostgREST service_role usable.
grant all on table public.discount_codes to service_role;
grant all on table public.discount_redemptions to service_role;

notify pgrst, 'reload schema';
