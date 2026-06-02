-- Constraints audit — idempotency for beta metrics (safe to re-run).

-- Canonical: beta_master_completions.session_id is PRIMARY KEY (see 20260528120000).

-- Admin job mirror — one row per workflow session
create unique index if not exists admin_master_jobs_session_id_uidx
  on public.admin_master_jobs (session_id)
  where session_id is not null;

-- Paid / beta downloads — one export row per email + object_key
create unique index if not exists mastered_exports_email_object_key_uidx
  on public.mastered_exports (email, object_key);

-- Post-master feedback — one submission per mastering session (when session_id set)
create unique index if not exists beta_master_feedback_session_id_uidx
  on public.beta_master_feedback (session_id)
  where session_id is not null and session_id <> '';

-- Issue reports — one row per client actionId (dedupe double-submit)
create unique index if not exists beta_reported_issues_action_id_key
  on public.beta_reported_issues (action_id)
  where action_id is not null and action_id <> '';

-- Pipeline enrichment — no duplicate master_complete / download per session + user
create unique index if not exists admin_pipeline_events_session_event_email_uidx
  on public.admin_pipeline_events (event_type, session_id, user_email)
  where session_id is not null
    and user_email is not null
    and event_type in ('master_complete', 'download');
