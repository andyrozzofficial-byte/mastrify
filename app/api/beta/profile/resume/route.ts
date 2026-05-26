import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { ACCESS_COOKIE_NAME, hasMasteringAccess } from "../../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../../lib/betaProfileResponse"
import { getBetaProfileStatus } from "../../../../../lib/betaUserData"

export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  const normalized = normalizeBetaEmail(email)
  const status = await getBetaProfileStatus(normalized)
  const store = await cookies()
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const masteringAccess = await hasMasteringAccess(accessCookie, normalized)

  const payload = {
    complete: status.complete,
    hasMasteringAccess: masteringAccess || status.complete,
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
  }

  if (!status.complete) {
    return NextResponse.json(payload)
  }

  const response = NextResponse.json(payload)
  setBetaEmailCookieOnResponse(response, normalized)
  return response
}
