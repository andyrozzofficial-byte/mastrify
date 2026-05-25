import { NextResponse } from "next/server"
import {
  BETA_FEEDBACK_TABLE,
  betaFeedbackErrorForClient,
  buildBetaFeedbackRow,
} from "../../../lib/betaFeedbackDb"
import type { BetaFeedbackPayload } from "../../../lib/betaFeedbackTypes"
import {
  createSupabaseServerClient,
  getSupabaseUrl,
  isSupabaseDevLogging,
} from "../../../lib/supabaseServer"

function logDev(message: string, detail?: Record<string, unknown>) {
  if (!isSupabaseDevLogging) return
  if (detail) console.log(`[beta-feedback] ${message}`, detail)
  else console.log(`[beta-feedback] ${message}`)
}

function isValidPayload(body: unknown): body is BetaFeedbackPayload {
  if (!body || typeof body !== "object") return false
  const b = body as Record<string, unknown>
  return (
    typeof b.role === "string" &&
    b.role.length > 0 &&
    typeof b.genre === "string" &&
    typeof b.comparison === "string" &&
    Array.isArray(b.stoodOut) &&
    Array.isArray(b.soundedOff) &&
    typeof b.easeRating === "number" &&
    typeof b.speedPerception === "string" &&
    typeof b.releaseReady === "string" &&
    typeof b.wouldRelease === "string" &&
    typeof b.useAgainScore === "number" &&
    typeof b.recommendScore === "number" &&
    typeof b.sessionId === "string" &&
    b.sessionId.length > 0 &&
    typeof b.masteringStyle === "string" &&
    typeof b.stereoWidth === "number" &&
    typeof b.lowEnd === "number"
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Could not save feedback" }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    logDev("validation failed", { bodyKeys: body && typeof body === "object" ? Object.keys(body) : [] })
    return NextResponse.json({ error: "Could not save feedback" }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    logDev("supabase client unavailable", { url: getSupabaseUrl() })
    return NextResponse.json({ error: "Could not save feedback" }, { status: 503 })
  }

  const row = buildBetaFeedbackRow(body)

  logDev("insert start", {
    table: `public.${BETA_FEEDBACK_TABLE}`,
    sessionId: row.session_id,
    masteringStyle: row.mastering_style,
    hasResponses: Boolean(row.responses),
  })

  const { data, error } = await supabase
    .schema("public")
    .from(BETA_FEEDBACK_TABLE)
    .insert([row])
    .select("id")
    .single()

  if (error) {
    const mapped = betaFeedbackErrorForClient(error)
    if (isSupabaseDevLogging) {
      console.error("[beta-feedback] insert failed", {
        table: `public.${BETA_FEEDBACK_TABLE}`,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        tableMissing: mapped.tableMissing,
      })
      if (mapped.tableMissing) {
        console.error(
          "[beta-feedback] Run supabase/beta_master_feedback.sql in the Supabase SQL Editor, then wait a few seconds for schema cache reload."
        )
      }
    }
    return NextResponse.json(
      {
        error: mapped.message,
        ...(isSupabaseDevLogging && mapped.tableMissing ? { code: "table_missing" } : {}),
      },
      { status: mapped.tableMissing ? 503 : 500 }
    )
  }

  logDev("insert ok", { id: data?.id ?? null })

  return NextResponse.json({ ok: true, id: data?.id ?? null })
}
