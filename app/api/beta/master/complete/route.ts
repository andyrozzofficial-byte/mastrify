import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import { recordBetaMasterCompletion } from "../../../../../lib/betaMasterTracking"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import { getBetaMasteringUiStateForEmail, syncBetaProfileFromActivity } from "../../../../../lib/betaUserData"
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

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }

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

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    betaUi,
  })
}
