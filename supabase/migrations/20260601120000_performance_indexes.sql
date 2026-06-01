-- Performance indexes for scoped beta/admin queries (Disk IO reduction)

create index if not exists beta_master_feedback_contact_email_idx
  on public.beta_master_feedback (contact_email);

create index if not exists beta_master_feedback_contact_email_created_at_idx
  on public.beta_master_feedback (contact_email, created_at desc);

create index if not exists admin_support_inbox_email_idx
  on public.admin_support_inbox (email);

create index if not exists admin_support_inbox_email_created_at_idx
  on public.admin_support_inbox (email, created_at desc);

create index if not exists admin_support_inbox_created_at_idx
  on public.admin_support_inbox (created_at desc);

create index if not exists admin_pipeline_events_user_email_idx
  on public.admin_pipeline_events (user_email);

create index if not exists admin_pipeline_events_user_email_event_type_idx
  on public.admin_pipeline_events (user_email, event_type);

create index if not exists admin_pipeline_events_created_at_idx
  on public.admin_pipeline_events (created_at desc);

create index if not exists admin_customer_profiles_beta_signed_up_at_idx
  on public.admin_customer_profiles (beta_signed_up_at desc nulls last);

create index if not exists beta_master_completions_email_idx
  on public.beta_master_completions (email);

create index if not exists beta_master_completions_email_completed_at_idx
  on public.beta_master_completions (email, completed_at desc);

create index if not exists beta_reported_issues_reporter_email_idx
  on public.beta_reported_issues (reporter_email);

create index if not exists beta_reported_issues_session_id_idx
  on public.beta_reported_issues (session_id);

notify pgrst, 'reload schema';
