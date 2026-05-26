import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import { recordBetaMasterCompletion } from "../../../../../lib/betaMasterTracking"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import { syncBetaProfileFromActivity } from "../../../../../lib/betaUserData"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta tracking disabled" }, { status: 404 })
  }

  const store = await cookies()
  const email = await resolveBetaEmailFromCookies(store)
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  let body: {
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

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
  })
}
