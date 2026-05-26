import { formatChipSelections } from "./betaFeedbackChipOptions"
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import type { BetaFeedbackPulseBody } from "./betaFeedbackPulseTypes"
import type { BetaPostMasterQuickBody } from "./betaPostMasterFeedbackTypes"
import { createMasterSessionId } from "./masterSessionId"

/** PostgREST table: public.beta_master_feedback */
export const BETA_FEEDBACK_TABLE = "beta_master_feedback"

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
  feedback_stage: string
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
    feedback_stage: row.feedback_stage || "completed",
  }
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
