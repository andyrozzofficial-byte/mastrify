import { NextResponse } from "next/server"
import { isBetaFeedbackEnabled } from "../../../../lib/betaFeedbackFeature"
import {
  buildBetaFeedbackPulseRow,
  insertBetaFeedbackRow,
  sanitizeBetaFeedbackInsert,
} from "../../../../lib/betaFeedbackDb"
import {
  ANALYSIS_ACCURACY_OPTIONS,
  PREVIEW_COMPARISON_OPTIONS,
  type BetaFeedbackPulseBody,
} from "../../../../lib/betaFeedbackPulseTypes"
import { createSupabaseServerClient } from "../../../../lib/supabaseServer"

function validatePulse(body: unknown): { ok: true; data: BetaFeedbackPulseBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body is not an object" }
  const b = body as Record<string, unknown>
  const stage = b.feedbackStage
  if (stage !== "analysis" && stage !== "preview") {
    return { ok: false, error: "feedbackStage must be analysis or preview" }
  }

  const sessionId = typeof b.sessionId === "string" ? b.sessionId.trim() : ""
  if (!sessionId) return { ok: false, error: "sessionId required" }

  if (stage === "analysis") {
    const accuracy = typeof b.analysisAccuracy === "string" ? b.analysisAccuracy : ""
    if (!ANALYSIS_ACCURACY_OPTIONS.includes(accuracy as (typeof ANALYSIS_ACCURACY_OPTIONS)[number])) {
      return { ok: false, error: "Invalid analysisAccuracy" }
    }
    return {
      ok: true,
      data: {
        feedbackStage: "analysis",
        sessionId,
        trackName: typeof b.trackName === "string" ? b.trackName : null,
        analysisAccuracy: accuracy,
        analysisFeelsWrong: typeof b.analysisFeelsWrong === "string" ? b.analysisFeelsWrong : undefined,
      },
    }
  }

  const comparison = typeof b.previewComparison === "string" ? b.previewComparison : ""
  if (!PREVIEW_COMPARISON_OPTIONS.includes(comparison as (typeof PREVIEW_COMPARISON_OPTIONS)[number])) {
    return { ok: false, error: "Invalid previewComparison" }
  }
  if (!Array.isArray(b.previewStoodOut) || b.previewStoodOut.length === 0) {
    return { ok: false, error: "previewStoodOut required" }
  }

  return {
    ok: true,
    data: {
      feedbackStage: "preview",
      sessionId,
      trackName: typeof b.trackName === "string" ? b.trackName : null,
      masteringStyle: typeof b.masteringStyle === "string" ? b.masteringStyle : undefined,
      previewComparison: comparison,
      previewStoodOut: b.previewStoodOut.map(String),
    },
  }
}

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta feedback is disabled" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validated = validatePulse(body)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }

  const row = sanitizeBetaFeedbackInsert(buildBetaFeedbackPulseRow(validated.data))
  const insertResult = await insertBetaFeedbackRow(supabase, row, { selectId: false })

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  if (insertResult.strippedColumns.length > 0) {
    console.warn("[beta-feedback/pulse] omitted columns — run supabase migration", insertResult.strippedColumns)
  }

  return NextResponse.json({ ok: true, success: true })
}
