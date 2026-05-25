import type { BetaFeedbackPayload } from "./betaFeedbackTypes"

/** PostgREST table: public.beta_master_feedback */
export const BETA_FEEDBACK_TABLE = "beta_master_feedback"

export type BetaFeedbackRow = {
  responses: BetaFeedbackPayload
  contact_email: string | null
  contact_discord: string | null
  future_beta_contact: boolean | null
  master_object_key: string | null
  track_title: string | null
  session_id: string
  track_name: string | null
  track_duration: number | null
  mastering_style: string
  stereo_width: number | null
  low_end: number | null
  master_lufs: number | null
  processing_time_ms: number | null
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

export function buildBetaFeedbackRow(body: BetaFeedbackPayload): BetaFeedbackRow {
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : ""
  const contactDiscord = typeof body.contactDiscord === "string" ? body.contactDiscord.trim() : ""
  const trackName =
    typeof body.trackName === "string" && body.trackName.trim()
      ? body.trackName.trim()
      : typeof body.trackTitle === "string" && body.trackTitle.trim()
        ? body.trackTitle.trim()
        : null

  return {
    responses: body,
    contact_email: contactEmail || null,
    contact_discord: contactDiscord || null,
    future_beta_contact:
      typeof body.futureBetaContact === "boolean" ? body.futureBetaContact : null,
    master_object_key:
      typeof body.masterObjectKey === "string" && body.masterObjectKey.trim()
        ? body.masterObjectKey.trim()
        : null,
    track_title: trackName,
    session_id: body.sessionId.trim(),
    track_name: trackName,
    track_duration: numOrNull(body.trackDuration),
    mastering_style: body.masteringStyle.trim(),
    stereo_width: intOrNull(body.stereoWidth),
    low_end: intOrNull(body.lowEnd),
    master_lufs:
      body.masterLufs != null && Number.isFinite(body.masterLufs)
        ? Number(Number(body.masterLufs).toFixed(2))
        : null,
    processing_time_ms: intOrNull(body.processingTimeMs),
  }
}

/** Map PostgREST errors to a safe client message (no raw DB text). */
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
    message: "Could not save feedback",
    tableMissing,
  }
}
