-- Revenue and checkout metadata for Admin export KPIs.
ALTER TABLE public.mastered_exports
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS track_title text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

COMMENT ON COLUMN public.mastered_exports.amount_cents IS 'Stripe checkout amount in cents at time of export.';
COMMENT ON COLUMN public.mastered_exports.track_title IS 'Customer track filename at export.';
COMMENT ON COLUMN public.mastered_exports.stripe_session_id IS 'Stripe Checkout Session id for paid exports.';
