import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import {
  recordBetaMasterDownload,
  resolveBetaDownloadObjectKey,
} from "../../../../../lib/betaMasterTracking"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import {
  fetchBetaProfilePanelForEmail,
  syncBetaProfileFromActivity,
} from "../../../../../lib/betaUserData"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta tracking disabled" }, { status: 404 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  let body: {
    email?: string
    objectKey?: string
    sessionId?: string
    trackTitle?: string | null
    expiresAt?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const bodyEmail = typeof body.email === "string" ? normalizeBetaEmail(body.email) : ""
  const email = cookieEmail ?? (bodyEmail.includes("@") ? bodyEmail : null)
  if (!email) {
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

  const objectKey = resolveBetaDownloadObjectKey(body.objectKey, body.sessionId)
  if (!objectKey) {
    return NextResponse.json({ error: "objectKey or sessionId required" }, { status: 400 })
  }

  const result = await recordBetaMasterDownload({
    email,
    objectKey,
    sessionId: body.sessionId,
    trackTitle: body.trackTitle,
    expiresAt: body.expiresAt,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.created) {
    await syncBetaProfileFromActivity(email)
  }

  const panelResult = await fetchBetaProfilePanelForEmail(email)

  return NextResponse.json({
    ok: true,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    panel: "error" in panelResult ? null : panelResult.panel,
  })
}
