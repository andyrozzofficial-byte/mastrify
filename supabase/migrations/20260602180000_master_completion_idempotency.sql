-- Idempotent mirrors for completion side-effects (canonical rows live in beta_master_completions).

create unique index if not exists admin_master_jobs_session_id_uidx
  on public.admin_master_jobs (session_id)
  where session_id is not null;

create unique index if not exists mastered_exports_email_object_key_uidx
  on public.mastered_exports (email, object_key);
