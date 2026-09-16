-- Backfill amount_cents for 100% discount exports (ANDYFREE, MASTRIFY50, etc.).
-- Preserves all historical mastering/export rows; only corrects revenue classification.
UPDATE public.mastered_exports AS me
SET amount_cents = 0
FROM public.discount_redemptions AS dr
WHERE dr.object_key = me.object_key
  AND dr.final_amount_cents = 0
  AND (me.amount_cents IS NULL OR me.amount_cents <> 0);
