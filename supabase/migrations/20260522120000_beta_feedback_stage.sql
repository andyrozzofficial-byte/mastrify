-- Beta feedback journey stage (analysis | preview | completed; legacy rows default new)
alter table public.beta_master_feedback
  add column if not exists feedback_stage text default 'new';

update public.beta_master_feedback
set feedback_stage = 'new'
where feedback_stage is null;

create index if not exists beta_master_feedback_stage_idx
  on public.beta_master_feedback (feedback_stage);

notify pgrst, 'reload schema';
