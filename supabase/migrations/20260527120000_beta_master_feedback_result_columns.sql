-- Result-page feedback columns + feedback_stage (idempotent for partial deployments)
-- Run via Supabase CLI or SQL Editor, then: notify pgrst, 'reload schema';

alter table public.beta_master_feedback
  add column if not exists feedback_stage text default 'new';

alter table public.beta_master_feedback
  add column if not exists liked_features jsonb default '[]'::jsonb;

alter table public.beta_master_feedback
  add column if not exists improvements jsonb default '[]'::jsonb;

alter table public.beta_master_feedback
  add column if not exists optional_comment text;

alter table public.beta_master_feedback
  add column if not exists rating integer;

alter table public.beta_master_feedback
  add column if not exists would_use_again text;

alter table public.beta_master_feedback
  add column if not exists user_type text;

alter table public.beta_master_feedback
  add column if not exists genre text;

alter table public.beta_master_feedback
  add column if not exists loudness_rating text;

alter table public.beta_master_feedback
  add column if not exists low_end_rating text;

alter table public.beta_master_feedback
  add column if not exists stereo_rating text;

alter table public.beta_master_feedback
  add column if not exists clarity_rating text;

update public.beta_master_feedback
set feedback_stage = 'new'
where feedback_stage is null;

update public.beta_master_feedback
set liked_features = '[]'::jsonb
where liked_features is null;

update public.beta_master_feedback
set improvements = '[]'::jsonb
where improvements is null;

create index if not exists beta_master_feedback_stage_idx
  on public.beta_master_feedback (feedback_stage);

create index if not exists beta_master_feedback_rating_idx
  on public.beta_master_feedback (rating);

notify pgrst, 'reload schema';
