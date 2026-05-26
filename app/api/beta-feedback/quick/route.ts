import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../lib/betaSession"
import { isBetaFeedbackEnabled } from "../../../../lib/betaFeedbackFeature"
import {
  BETA_FEEDBACK_TABLE,
  buildBetaPostMasterQuickRow,
  sanitizeBetaFeedbackInsert,
} from "../../../../lib/betaFeedbackDb"
import {
  BETA_IMPROVEMENT_OPTIONS,
  BETA_LIKED_FEATURE_OPTIONS,
} from "../../../../lib/betaFeedbackChipOptions"
import {
  BETA_WOULD_USE_AGAIN_OPTIONS,
  type BetaPostMasterQuickBody,
} from "../../../../lib/betaPostMasterFeedbackTypes"
import { createSupabaseServerClient } from "../../../../lib/supabaseServer"
import { touchBetaProfileFromFeedback } from "../../../../lib/betaUserData"

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v).trim()).filter(Boolean)
}

function validate(body: unknown): { ok: true; data: BetaPostMasterQuickBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body is not an object" }
  const b = body as Record<string, unknown>
  const sessionId = typeof b.sessionId === "string" ? b.sessionId.trim() : ""
  if (!sessionId) return { ok: false, error: "sessionId required" }

  const masterRating = typeof b.masterRating === "number" ? b.masterRating : Number(b.masterRating)
  if (!Number.isFinite(masterRating) || masterRating < 1 || masterRating > 10) {
    return { ok: false, error: "masterRating must be 1–10" }
  }

  const likedFeatures = parseStringArray(b.likedFeatures ?? b.liked_features)
  const improvements = parseStringArray(b.improvements)
  if (likedFeatures.length === 0) {
    return { ok: false, error: "Select at least one thing that sounded good" }
  }
  if (improvements.length === 0) {
    return { ok: false, error: "Select at least one improvement area" }
  }
  const invalidLiked = likedFeatures.find((c) => !(BETA_LIKED_FEATURE_OPTIONS as readonly string[]).includes(c))
  if (invalidLiked) return { ok: false, error: `Invalid liked feature: ${invalidLiked}` }
  const invalidImprove = improvements.find((c) => !(BETA_IMPROVEMENT_OPTIONS as readonly string[]).includes(c))
  if (invalidImprove) return { ok: false, error: `Invalid improvement: ${invalidImprove}` }

  const wouldUseAgain = typeof b.wouldUseAgain === "string" ? b.wouldUseAgain : ""
  if (!BETA_WOULD_USE_AGAIN_OPTIONS.includes(wouldUseAgain as (typeof BETA_WOULD_USE_AGAIN_OPTIONS)[number])) {
    return { ok: false, error: "Invalid wouldUseAgain" }
  }

  const optionalComment =
    typeof b.optionalComment === "string"
      ? b.optionalComment.trim()
      : typeof b.optional_comment === "string"
        ? b.optional_comment.trim()
        : ""

  return {
    ok: true,
    data: {
      sessionId,
      trackName: typeof b.trackName === "string" ? b.trackName : null,
      masteringStyle: typeof b.masteringStyle === "string" ? b.masteringStyle : undefined,
      masterObjectKey: typeof b.masterObjectKey === "string" ? b.masterObjectKey : null,
      trackDuration: typeof b.trackDuration === "number" ? b.trackDuration : null,
      stereoWidth: typeof b.stereoWidth === "number" ? b.stereoWidth : undefined,
      lowEnd: typeof b.lowEnd === "number" ? b.lowEnd : undefined,
      masterLufs: typeof b.masterLufs === "number" ? b.masterLufs : null,
      processingTimeMs: typeof b.processingTimeMs === "number" ? b.processingTimeMs : null,
      masterRating: Math.round(masterRating),
      likedFeatures,
      improvements,
      optionalComment,
      wouldUseAgain: wouldUseAgain as BetaPostMasterQuickBody["wouldUseAgain"],
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

  const validated = validate(body)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)
  const contactEmail = cookieEmail ? normalizeBetaEmail(cookieEmail) : null

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }

  const row = sanitizeBetaFeedbackInsert(buildBetaPostMasterQuickRow(validated.data, contactEmail))
  const { error } = await supabase.from(BETA_FEEDBACK_TABLE).insert([row])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (contactEmail) {
    await touchBetaProfileFromFeedback(contactEmail, null)
  }

  return NextResponse.json({ ok: true, success: true })
}
