import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import {
  countBetaMastersForEmail,
  fetchBetaMasterCompletionsForEmail,
  recordBetaMasterCompletion,
  resolveBetaMasterCompletionSessionId,
} from "../../../../../lib/betaMasterTracking"
import { getBetaReporterEmail } from "../../../../../lib/betaReporterEmail"
import { createMasterSessionId } from "../../../../../lib/masterSessionId"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import {
  fetchBetaProfilePanelForEmail,
  getBetaMasteringUiStateForEmail,
  syncBetaProfileFromActivity,
} from "../../../../../lib/betaUserData"
import { getSupabaseEnvStatus } from "../../../../../lib/supabaseServer"
import { PERF_DEBUG } from "../../../../../lib/perfDebug"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta tracking disabled" }, { status: 404 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  let body: {
    email?: string
    deliveryEmail?: string
    sessionId?: string
    objectKey?: string | null
    trackName?: string | null
    masteringStyle?: string | null
    processingTimeMs?: number | null
    masterLufs?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId =
    resolveBetaMasterCompletionSessionId(body.sessionId, body.objectKey) || createMasterSessionId()

  const sessionIdSource = body.sessionId?.trim()
    ? "body.sessionId"
    : body.objectKey?.trim()
      ? "body.objectKey"
      : "generated"

  const bodyEmail = getBetaReporterEmail(
    typeof body.email === "string" ? body.email : null,
    typeof body.deliveryEmail === "string" ? body.deliveryEmail : null,
  )
  const email = cookieEmail ?? (bodyEmail.includes("@") ? bodyEmail : null)

  if (PERF_DEBUG) {
    console.log("[beta-debug] master complete (server)", {
      sessionIdResolved: sessionId,
      sessionIdSource,
      bodySessionId: body.sessionId ?? null,
      objectKey: body.objectKey ?? null,
      cookieEmail: cookieEmail ?? null,
      bodyEmail: bodyEmail ?? null,
      deliveryEmail: body.deliveryEmail ?? null,
      finalEmail: email,
      trackName: body.trackName ?? null,
    })
  }

  if (!email) {
    console.error("[beta-api] master complete: no email (cookie or body)", getSupabaseEnvStatus())
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

  const completionsBefore = await fetchBetaMasterCompletionsForEmail(email)
  console.log("[beta-api] master complete: request", {
    email,
    sessionId,
    objectKey: body.objectKey ?? null,
    completionsBefore: completionsBefore.length,
    supabase: getSupabaseEnvStatus(),
  })

  const result = await recordBetaMasterCompletion({
    email,
    sessionId,
    objectKey: body.objectKey,
    trackName: body.trackName,
    masteringStyle: body.masteringStyle,
    processingTimeMs: body.processingTimeMs,
    masterLufs: body.masterLufs,
  })

  if ("error" in result) {
    console.error("[beta-api] master complete: record failed", {
      email,
      sessionId,
      error: result.error,
    })
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.created) {
    await syncBetaProfileFromActivity(email)
  }

  const completionsAfter = await fetchBetaMasterCompletionsForEmail(email)
  const masterCount = await countBetaMastersForEmail(email)
  console.log("[beta-api] master complete: result", {
    email,
    sessionId,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    completionsAfter: completionsAfter.length,
    masterCount,
  })

  const betaUi = await getBetaMasteringUiStateForEmail(email)
  const panelResult = await fetchBetaProfilePanelForEmail(email)

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    betaUi,
    panel: "error" in panelResult ? null : panelResult.panel,
    masterCount,
    completionsCount: completionsAfter.length,
  })
}
