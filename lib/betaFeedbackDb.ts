import type { SupabaseClient } from "@supabase/supabase-js"
import { formatChipSelections } from "./betaFeedbackChipOptions"
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import type { BetaFeedbackPulseBody } from "./betaFeedbackPulseTypes"
import type { BetaPostMasterQuickBody } from "./betaPostMasterFeedbackTypes"
import { createMasterSessionId } from "./masterSessionId"

/** PostgREST table: public.beta_master_feedback */
export const BETA_FEEDBACK_TABLE = "beta_master_feedback"

const LOG_PREFIX = "[beta-feedback-db]"

/** Core columns present on every beta_master_feedback deployment. */
export const BETA_FEEDBACK_CORE_COLUMNS = [
  "session_id",
  "track_name",
  "track_duration",
  "mastering_style",
  "stereo_width",
  "low_end",
  "master_lufs",
  "processing_time_ms",
  "responses",
  "contact_email",
  "contact_discord",
  "future_beta_contact",
  "master_object_key",
  "track_title",
] as const

/** Added by migrations — omitted automatically if PostgREST schema cache lacks them. */
export const BETA_FEEDBACK_EXTENDED_COLUMNS = [
  "feedback_stage",
  "liked_features",
  "improvements",
  "optional_comment",
  "rating",
  "would_use_again",
  "user_type",
  "genre",
  "loudness_rating",
  "low_end_rating",
  "stereo_rating",
  "clarity_rating",
] as const

/** Columns accepted by public.beta_master_feedback (no id / created_at). */
export type BetaFeedbackInsertRow = {
  session_id: string
  track_name: string | null
  track_duration: number | null
  mastering_style: string
  stereo_width: number | null
  low_end: number | null
  master_lufs: number | null
  processing_time_ms: number | null
  responses: Record<string, unknown>
  contact_email: string | null
  contact_discord: string | null
  future_beta_contact: boolean | null
  master_object_key: string | null
  track_title: string | null
  feedback_stage?: string
  liked_features?: string[] | null
  improvements?: string[] | null
  optional_comment?: string | null
  rating?: number | null
  would_use_again?: string | null
  user_type?: string | null
  genre?: string | null
  loudness_rating?: string | null
  low_end_rating?: string | null
  stereo_rating?: string | null
  clarity_rating?: string | null
}

export type BetaFeedbackInsertResult = {
  data: { id?: string } | null
  error: { message: string; code?: string; details?: string; hint?: string } | null
  strippedColumns: string[]
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null
  return v
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v)
  if (n == null) return null
  return Math.round(n)
}

/** Strip undefined from JSON-safe survey payload stored in responses. */
function responsesJson(body: BetaFeedbackPayload): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(body)) as Record<string, unknown>
  return raw && typeof raw === "object" ? raw : {}
}

export function resolveSessionId(body: BetaFeedbackPayload): string {
  const fromBody = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  return fromBody || createMasterSessionId()
}

function parseMissingColumnFromError(message: string): string | null {
  const m =
    message.match(/Could not find the '([^']+)' column/i) ??
    message.match(/column "([^"]+)" of relation/i) ??
    message.match(/column ([a-z_][a-z0-9_]*) does not exist/i)
  return m?.[1] ?? null
}

function jsonArrayOrNull(value: string[] | undefined): string[] | null {
  if (!value?.length) return null
  return value
}

function parseLineFromMissing(missing: string, label: string): string | null {
  if (!missing.trim()) return null
  const re = new RegExp(`^${label}:\\s*(.+)$`, "im")
  const line = missing.split("\n").find((l) => re.test(l.trim()))
  if (!line) return null
  const m = line.trim().match(re)
  return m?.[1]?.trim() ?? null
}

function denormalizedFromPayload(body: BetaFeedbackPayload) {
  return {
    liked_features: jsonArrayOrNull(body.liked_features),
    improvements: jsonArrayOrNull(body.improvements),
    optional_comment: body.optional_comment?.trim() || null,
    rating: Number.isFinite(body.recommendScore) ? Math.round(body.recommendScore) : null,
    would_use_again: body.wouldRelease?.trim() || null,
    user_type: body.role?.trim() || null,
    genre: body.genre?.trim() || null,
    loudness_rating: body.loudnessRating ?? parseLineFromMissing(body.missing, "Loudness"),
    low_end_rating: body.lowEndRating ?? parseLineFromMissing(body.missing, "Low-end"),
    stereo_rating: body.stereoRating ?? parseLineFromMissing(body.missing, "Stereo image"),
    clarity_rating: body.clarityRating ?? parseLineFromMissing(body.missing, "Clarity"),
  }
}

/** Convert insert row to a plain record (drops undefined keys). */
export function betaFeedbackRowToRecord(row: BetaFeedbackInsertRow): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Insert with automatic retry when Supabase schema is missing optional columns.
 * Always keeps full survey data in `responses` even when denormalized columns are stripped.
 */
export async function insertBetaFeedbackRow(
  supabase: SupabaseClient,
  row: BetaFeedbackInsertRow,
  opts?: { selectId?: boolean },
): Promise<BetaFeedbackInsertResult> {
  const selectId = opts?.selectId ?? true
  let record = betaFeedbackRowToRecord(row)
  const strippedColumns: string[] = []
  const maxAttempts = BETA_FEEDBACK_EXTENDED_COLUMNS.length + 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const query = supabase.from(BETA_FEEDBACK_TABLE).insert([record])
    const result = selectId ? await query.select("id").single() : await query

    if (!result.error) {
      const id =
        result.data && typeof result.data === "object" && "id" in result.data
          ? String((result.data as { id: string }).id)
          : undefined
      return { data: id ? { id } : null, error: null, strippedColumns }
    }

    const missingCol = parseMissingColumnFromError(result.error.message ?? "")
    if (missingCol && missingCol in record) {
      console.warn(`${LOG_PREFIX} omitting missing column "${missingCol}" — apply supabase migration 20260527120000`)
      delete record[missingCol]
      strippedColumns.push(missingCol)
      continue
    }

    return {
      data: null,
      error: {
        message: result.error.message,
        code: result.error.code,
        details: result.error.details ?? undefined,
        hint: result.error.hint ?? undefined,
      },
      strippedColumns,
    }
  }

  return {
    data: null,
    error: { message: "Could not save feedback after schema fallback retries" },
    strippedColumns,
  }
}

export function buildBetaFeedbackRow(body: BetaFeedbackPayload): BetaFeedbackInsertRow {
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : ""
  const contactDiscord = typeof body.contactDiscord === "string" ? body.contactDiscord.trim() : ""
  const trackName =
    typeof body.trackName === "string" && body.trackName.trim()
      ? body.trackName.trim()
      : typeof body.trackTitle === "string" && body.trackTitle.trim()
        ? body.trackTitle.trim()
        : null

  const masteringStyle =
    typeof body.masteringStyle === "string" && body.masteringStyle.trim()
      ? body.masteringStyle.trim()
      : "Unknown"

  const responses = responsesJson(body) as Record<string, unknown>
  responses.feedbackStage = "completed"

  return {
    session_id: resolveSessionId(body),
    track_name: trackName,
    track_duration: numOrNull(body.trackDuration),
    mastering_style: masteringStyle,
    stereo_width: intOrNull(body.stereoWidth),
    low_end: intOrNull(body.lowEnd),
    master_lufs:
      body.masterLufs != null && Number.isFinite(body.masterLufs)
        ? Number(Number(body.masterLufs).toFixed(2))
        : null,
    processing_time_ms: intOrNull(body.processingTimeMs),
    responses,
    contact_email: contactEmail || null,
    contact_discord: contactDiscord || null,
    future_beta_contact:
      typeof body.futureBetaContact === "boolean" ? body.futureBetaContact : null,
    master_object_key:
      typeof body.masterObjectKey === "string" && body.masterObjectKey.trim()
        ? body.masterObjectKey.trim()
        : null,
    track_title: trackName,
    feedback_stage: "completed",
    ...denormalizedFromPayload(body),
  }
}

function useAgainScoreFromChoice(choice: string): number {
  if (choice === "Yes") return 9
  if (choice === "Maybe") return 5
  return 2
}

export function buildBetaPostMasterQuickRow(
  body: BetaPostMasterQuickBody,
  contactEmail: string | null,
): BetaFeedbackInsertRow {
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim()
      : createMasterSessionId()
  const trackName =
    typeof body.trackName === "string" && body.trackName.trim() ? body.trackName.trim() : null
  const masteringStyle =
    typeof body.masteringStyle === "string" && body.masteringStyle.trim()
      ? body.masteringStyle.trim()
      : "Unknown"

  const liked = body.likedFeatures.filter(Boolean)
  const improve = body.improvements.filter(Boolean)
  const optionalComment = body.optionalComment?.trim() ?? ""
  const soundedGood = formatChipSelections(liked)
  const couldImprove = formatChipSelections(improve)

  const responses: Record<string, unknown> = {
    feedbackStage: "post_master_quick",
    sessionId,
    trackName,
    masterRating: body.masterRating,
    liked_features: liked,
    improvements: improve,
    optional_comment: optionalComment,
    soundedGood,
    couldImprove,
    wouldUseAgain: body.wouldUseAgain,
    recommendScore: body.masterRating,
    useAgainScore: useAgainScoreFromChoice(body.wouldUseAgain),
    additional: optionalComment
      ? [soundedGood, "", "Optional comment:", optionalComment].filter(Boolean).join("\n")
      : soundedGood,
    oneChange: couldImprove,
  }

  return {
    session_id: sessionId,
    track_name: trackName,
    track_duration: numOrNull(body.trackDuration),
    mastering_style: masteringStyle,
    stereo_width: intOrNull(body.stereoWidth),
    low_end: intOrNull(body.lowEnd),
    master_lufs:
      body.masterLufs != null && Number.isFinite(body.masterLufs)
        ? Number(Number(body.masterLufs).toFixed(2))
        : null,
    processing_time_ms: intOrNull(body.processingTimeMs),
    responses,
    contact_email: contactEmail,
    contact_discord: null,
    future_beta_contact: null,
    master_object_key:
      typeof body.masterObjectKey === "string" && body.masterObjectKey.trim()
        ? body.masterObjectKey.trim()
        : null,
    track_title: trackName,
    feedback_stage: "post_master_quick",
    liked_features: liked.length ? liked : null,
    improvements: improve.length ? improve : null,
    optional_comment: optionalComment || null,
    rating: Math.round(body.masterRating),
    would_use_again: body.wouldUseAgain,
  }
}

export function buildBetaFeedbackPulseRow(body: BetaFeedbackPulseBody): BetaFeedbackInsertRow {
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim()
      : createMasterSessionId()
  const trackName =
    typeof body.trackName === "string" && body.trackName.trim() ? body.trackName.trim() : null

  const responses: Record<string, unknown> = {
    feedbackStage: body.feedbackStage,
    sessionId,
    trackName,
  }

  if (body.feedbackStage === "analysis") {
    responses.analysisAccuracy = body.analysisAccuracy
    if (body.analysisFeelsWrong?.trim()) responses.analysisFeelsWrong = body.analysisFeelsWrong.trim()
  } else {
    responses.previewComparison = body.previewComparison
    responses.previewStoodOut = body.previewStoodOut
    if (body.masteringStyle) responses.masteringStyle = body.masteringStyle
  }

  return {
    session_id: sessionId,
    track_name: trackName,
    track_duration: null,
    mastering_style:
      body.feedbackStage === "preview" && body.masteringStyle?.trim()
        ? body.masteringStyle.trim()
        : "Unknown",
    stereo_width: null,
    low_end: null,
    master_lufs: null,
    processing_time_ms: null,
    responses,
    contact_email: null,
    contact_discord: null,
    future_beta_contact: null,
    master_object_key: null,
    track_title: trackName,
    feedback_stage: body.feedbackStage,
  }
}

/** Exact table columns only; omit undefined (PostgREST rejects undefined). */
export function sanitizeBetaFeedbackInsert(row: BetaFeedbackInsertRow): BetaFeedbackInsertRow {
  const out: BetaFeedbackInsertRow = {
    session_id: row.session_id,
    track_name: row.track_name ?? null,
    track_duration: row.track_duration ?? null,
    mastering_style: row.mastering_style || "Unknown",
    stereo_width: row.stereo_width ?? null,
    low_end: row.low_end ?? null,
    master_lufs: row.master_lufs ?? null,
    processing_time_ms: row.processing_time_ms ?? null,
    responses:
      row.responses && typeof row.responses === "object" && !Array.isArray(row.responses)
        ? row.responses
        : {},
    contact_email: row.contact_email ?? null,
    contact_discord: row.contact_discord ?? null,
    future_beta_contact: row.future_beta_contact ?? null,
    master_object_key: row.master_object_key ?? null,
    track_title: row.track_title ?? null,
  }

  if (row.feedback_stage) out.feedback_stage = row.feedback_stage
  if (row.liked_features != null) out.liked_features = row.liked_features
  if (row.improvements != null) out.improvements = row.improvements
  if (row.optional_comment != null) out.optional_comment = row.optional_comment
  if (row.rating != null) out.rating = row.rating
  if (row.would_use_again != null) out.would_use_again = row.would_use_again
  if (row.user_type != null) out.user_type = row.user_type
  if (row.genre != null) out.genre = row.genre
  if (row.loudness_rating != null) out.loudness_rating = row.loudness_rating
  if (row.low_end_rating != null) out.low_end_rating = row.low_end_rating
  if (row.stereo_rating != null) out.stereo_rating = row.stereo_rating
  if (row.clarity_rating != null) out.clarity_rating = row.clarity_rating

  return out
}

/** Map PostgREST errors (optional generic fallback). */
export function betaFeedbackErrorForClient(error: { code?: string; message?: string } | null): {
  message: string
  tableMissing: boolean
} {
  const msg = error?.message ?? ""
  const code = error?.code ?? ""
  const tableMissing =
    code === "PGRST205" ||
    /could not find the table/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /relation.*does not exist/i.test(msg)

  return {
    message: msg || "Could not save feedback",
    tableMissing,
  }
}
