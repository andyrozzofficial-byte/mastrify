import { MASTERED_EXPORTS_TABLE } from "./adminData"
import { normalizeBetaEmail } from "./betaAccess"
import { createSupabaseServerClient } from "./supabaseServer"
export const BETA_MASTER_COMPLETIONS_TABLE = "beta_master_completions"

export type BetaMasterCompletionRow = {
  session_id: string
  email: string
  track_name: string | null
  mastering_style: string | null
  processing_time_ms: number | null
  master_lufs: number | null
  completed_at: string
  created_at: string
}

function logBeta(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(`[beta] ${message}`, detail)
  else console.log(`[beta] ${message}`)
}

export async function fetchBetaMasterCompletionsForEmail(
  email: string,
): Promise<BetaMasterCompletionRow[]> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return []

  const normalized = normalizeBetaEmail(email)
  const { data, error } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select(
      "session_id, email, track_name, mastering_style, processing_time_ms, master_lufs, completed_at, created_at",
    )
    .eq("email", normalized)
    .order("completed_at", { ascending: false })
    .limit(500)

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return []
    return []
  }

  return (data ?? []).map((row) => ({
    session_id: String(row.session_id),
    email: String(row.email),
    track_name: row.track_name ?? null,
    mastering_style: row.mastering_style ?? null,
    processing_time_ms:
      row.processing_time_ms != null ? Number(row.processing_time_ms) : null,
    master_lufs: row.master_lufs != null ? Number(row.master_lufs) : null,
    completed_at: String(row.completed_at),
    created_at: String(row.created_at ?? row.completed_at),
  }))
}

export async function isBetaMasterSessionCompleted(sessionId: string): Promise<boolean> {
  const sid = sessionId.trim()
  if (!sid) return false

  const supabase = createSupabaseServerClient()
  if (!supabase) return false

  const { data, error } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select("session_id")
    .eq("session_id", sid)
    .maybeSingle()

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return false
    return false
  }

  return Boolean(data?.session_id)
}

export type RecordBetaMasterCompletionInput = {
  email: string
  sessionId: string
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
}

export type RecordBetaMasterCompletionResult =
  | { ok: true; created: true; alreadyCounted: false }
  | { ok: true; created: false; alreadyCounted: true }
  | { error: string }

export async function recordBetaMasterCompletion(
  input: RecordBetaMasterCompletionInput,
): Promise<RecordBetaMasterCompletionResult> {
  const sessionId = input.sessionId.trim()
  const email = normalizeBetaEmail(input.email)
  if (!sessionId) return { error: "session_id required" }
  if (!email.includes("@")) return { error: "email required" }

  const alreadyCounted = await isBetaMasterSessionCompleted(sessionId)
  if (alreadyCounted) {
    logBeta("master already counted", { sessionId })
    return { ok: true, created: false, alreadyCounted: true }
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const completedAt = new Date().toISOString()
  const row = {
    session_id: sessionId,
    email,
    track_name: input.trackName?.trim() || null,
    mastering_style: input.masteringStyle?.trim() || null,
    processing_time_ms:
      input.processingTimeMs != null && Number.isFinite(input.processingTimeMs)
        ? Math.max(0, Math.round(input.processingTimeMs))
        : null,
    master_lufs:
      input.masterLufs != null && Number.isFinite(input.masterLufs) ? input.masterLufs : null,
    completed_at: completedAt,
  }

  const { error } = await supabase.from(BETA_MASTER_COMPLETIONS_TABLE).insert(row)
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      logBeta("master already counted", { sessionId })
      return { ok: true, created: false, alreadyCounted: true }
    }
    if (/does not exist|42P01/i.test(error.message)) {
      return { error: "beta_master_completions table missing — run Supabase migration" }
    }
    return { error: error.message }
  }

  logBeta("master completed", { sessionId, email })
  return { ok: true, created: true, alreadyCounted: false }
}

export type RecordBetaMasterDownloadInput = {
  email: string
  objectKey: string
  trackTitle?: string | null
  expiresAt?: string | null
}

export type RecordBetaMasterDownloadResult = { ok: true } | { error: string }

export async function recordBetaMasterDownload(
  input: RecordBetaMasterDownloadInput,
): Promise<RecordBetaMasterDownloadResult> {
  const email = normalizeBetaEmail(input.email)
  const objectKey = input.objectKey.trim()
  if (!email.includes("@")) return { error: "email required" }
  if (!objectKey) return { error: "object_key required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { error } = await supabase.from(MASTERED_EXPORTS_TABLE).insert({
    email,
    object_key: objectKey,
    track_title: input.trackTitle?.trim() || null,
    expires_at: input.expiresAt?.trim() || null,
  })

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) {
      return { error: "mastered_exports table missing" }
    }
    return { error: error.message }
  }

  logBeta("download registered", { email, objectKey })
  return { ok: true }
}
