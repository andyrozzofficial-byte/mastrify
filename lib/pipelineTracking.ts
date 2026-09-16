import {
  MASTER_JOBS_TABLE,
  PIPELINE_EVENTS_TABLE,
} from "./adminData"
import { createSupabaseServerClient } from "./supabaseServer"
import { statsDebug } from "./statsDebug"
import {
  recordBetaMasterCompletion,
  type RecordBetaMasterCompletionInput,
} from "./betaMasterTracking"

export type PipelineEventType = "upload" | "analyze" | "master_complete" | "download"

const ANONYMOUS_EMAIL = "anonymous@mastrify.internal"

export type WritePipelineEventInput = {
  sessionId: string
  eventType: PipelineEventType
  userEmail?: string | null
  trackName?: string | null
  metadata?: Record<string, unknown>
}

/** Idempotent pipeline event insert (deduped by session + type). */
export async function writePipelineEvent(
  input: WritePipelineEventInput,
): Promise<{ ok: true } | { error: string }> {
  const sessionId = input.sessionId.trim()
  if (!sessionId) return { error: "sessionId required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const userEmail = input.userEmail?.trim().toLowerCase() || null

  const { data: existing } = await supabase
    .from(PIPELINE_EVENTS_TABLE)
    .select("id")
    .eq("event_type", input.eventType)
    .eq("session_id", sessionId)
    .maybeSingle()

  if (existing?.id) {
    statsDebug("pipeline event skipped (exists)", { eventType: input.eventType, sessionId })
    return { ok: true }
  }

  const { error } = await supabase.from(PIPELINE_EVENTS_TABLE).insert({
    session_id: sessionId,
    event_type: input.eventType,
    user_email: userEmail,
    track_name: input.trackName?.trim() || null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: true }
    if (/does not exist|42P01/i.test(error.message)) {
      return { error: "admin_pipeline_events table missing" }
    }
    return { error: error.message }
  }

  statsDebug("pipeline event written", { eventType: input.eventType, sessionId })
  return { ok: true }
}

export type RecordProductionMasterCompleteInput = Omit<
  RecordBetaMasterCompletionInput,
  "email"
> & {
  email?: string | null
}

/** Record a completed master for admin KPIs (works without user email). */
export async function recordProductionMasterComplete(
  input: RecordProductionMasterCompleteInput,
) {
  const email = input.email?.trim() || ANONYMOUS_EMAIL
  return recordBetaMasterCompletion({ ...input, email }, { pipelineAsync: true })
}

export async function recordFailedMasterJob(input: {
  sessionId: string
  userEmail?: string | null
  trackName?: string | null
  errorLog?: string | null
}): Promise<{ ok: true } | { error: string }> {
  const sessionId = input.sessionId.trim()
  if (!sessionId) return { error: "sessionId required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data: existing } = await supabase
    .from(MASTER_JOBS_TABLE)
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle()

  const fields = {
    session_id: sessionId,
    user_email: input.userEmail?.trim().toLowerCase() || null,
    track_name: input.trackName?.trim() || null,
    status: "failed",
    error_log: input.errorLog?.slice(0, 2000) || "Mastering failed",
    source: "production",
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from(MASTER_JOBS_TABLE).update(fields).eq("id", existing.id)
    return error ? { error: error.message } : { ok: true }
  }

  const { error } = await supabase.from(MASTER_JOBS_TABLE).insert({
    ...fields,
    created_at: new Date().toISOString(),
  })

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return { ok: true }
    return { error: error.message }
  }
  return { ok: true }
}
