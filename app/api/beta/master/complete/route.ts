import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import {
  recordBetaMasterCompletion,
  resolveBetaMasterCompletionSessionId,
} from "../../../../../lib/betaMasterTracking"
import { getBetaReporterEmail } from "../../../../../lib/betaReporterEmail"
import { createMasterSessionId } from "../../../../../lib/masterSessionId"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import { buildBetaMasterCompleteStats } from "../../../../../lib/betaUserData"
import { beginDbRoute, endDbRoute } from "../../../../../lib/supabaseTimed"
import { getSupabaseEnvStatus } from "../../../../../lib/supabaseServer"
import { PERF_DEBUG } from "../../../../../lib/perfDebug"

export async function POST(request: Request) {
  beginDbRoute("POST /api/beta/master/complete")
  const endpointStart = Date.now()

  if (!isBetaFeedbackEnabled()) {
    endDbRoute()
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
    endDbRoute()
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId =
    resolveBetaMasterCompletionSessionId(body.sessionId, body.objectKey) || createMasterSessionId()

  const bodyEmail = getBetaReporterEmail(
    typeof body.email === "string" ? body.email : null,
    typeof body.deliveryEmail === "string" ? body.deliveryEmail : null,
  )
  const email = cookieEmail ?? (bodyEmail.includes("@") ? bodyEmail : null)

  if (PERF_DEBUG) {
    console.log("[beta-debug] master complete (server)", {
      sessionIdResolved: sessionId,
      cookieEmail: cookieEmail ?? null,
      finalEmail: email,
    })
  }

  if (!email) {
    console.error("[beta-api] master complete: no email (cookie or body)", getSupabaseEnvStatus())
    endDbRoute()
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

  const result = await recordBetaMasterCompletion(
    {
      email,
      sessionId,
      objectKey: body.objectKey,
      trackName: body.trackName,
      masteringStyle: body.masteringStyle,
      processingTimeMs: body.processingTimeMs,
      masterLufs: body.masterLufs,
    },
    { fastPath: true, pipelineAsync: true },
  )

  if ("error" in result) {
    console.error("[beta-api] master complete: record failed", { email, sessionId, error: result.error })
    const dbStats = endDbRoute()
    console.log("[beta-api] master complete timing", {
      endpointMs: Date.now() - endpointStart,
      ...dbStats,
    })
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const stats = result.alreadyCounted ? null : await buildBetaMasterCompleteStats(email)
  const dbStats = endDbRoute()
  const endpointMs = Date.now() - endpointStart

  console.log("[beta-api] master complete timing", {
    email,
    sessionId,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    endpointMs,
    dbQueryCount: dbStats?.queryCount ?? 0,
    dbMs: dbStats?.dbMs ?? 0,
  })

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    betaUi: stats?.betaUi ?? null,
    masterCount: stats?.masterCount ?? null,
    completionsCount: stats?.completionsCount ?? null,
  })
}
