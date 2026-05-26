import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import {
  recordBetaMasterCompletion,
  resolveBetaMasterCompletionSessionId,
} from "../../../../../lib/betaMasterTracking"
import { createMasterSessionId } from "../../../../../lib/masterSessionId"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import {
  fetchBetaProfilePanelForEmail,
  getBetaMasteringUiStateForEmail,
  syncBetaProfileFromActivity,
} from "../../../../../lib/betaUserData"
import { getSupabaseEnvStatus } from "../../../../../lib/supabaseServer"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta tracking disabled" }, { status: 404 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  let body: {
    email?: string
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

  const bodyEmail = typeof body.email === "string" ? normalizeBetaEmail(body.email) : ""
  const email =
    cookieEmail ??
    (bodyEmail.includes("@") ? bodyEmail : null)

  if (!email) {
    console.error("[beta-api] master complete: no email (cookie or body)", getSupabaseEnvStatus())
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

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
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.created) {
    await syncBetaProfileFromActivity(email)
  }

  const betaUi = await getBetaMasteringUiStateForEmail(email)
  const panelResult = await fetchBetaProfilePanelForEmail(email)

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    betaUi,
    panel: "error" in panelResult ? null : panelResult.panel,
  })
}
