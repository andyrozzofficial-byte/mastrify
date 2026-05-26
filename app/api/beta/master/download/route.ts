import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isBetaFeedbackEnabled } from "../../../../../lib/betaFeedbackFeature"
import { recordBetaMasterDownload } from "../../../../../lib/betaMasterTracking"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta tracking disabled" }, { status: 404 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  let body: { email?: string; objectKey?: string; trackTitle?: string | null; expiresAt?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : ""
  if (!objectKey) {
    return NextResponse.json({ error: "objectKey required" }, { status: 400 })
  }

  const bodyEmail = typeof body.email === "string" ? normalizeBetaEmail(body.email) : ""
  const email = cookieEmail ?? (bodyEmail.includes("@") ? bodyEmail : null)
  if (!email) {
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

  const result = await recordBetaMasterDownload({
    email,
    objectKey,
    trackTitle: body.trackTitle,
    expiresAt: body.expiresAt,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
