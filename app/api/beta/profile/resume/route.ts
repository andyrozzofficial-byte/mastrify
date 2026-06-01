import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import { ACCESS_COOKIE_NAME } from "../../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../../lib/betaUserAccess"
import { buildBetaUiForEmail, getBetaProfileStatus } from "../../../../../lib/betaUserData"

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
  const store = await cookies()
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const resolvedCookieEmail = await resolveBetaEmailFromCookies(store)
  const access = await resolveBetaUserAccess(accessCookie, resolvedCookieEmail, normalized)
  const status = await getBetaProfileStatus(normalized)

  const isBeta = Boolean(
    access.isBetaUser || access.profileExists || status.complete || status.profile,
  )

  const payload = {
    complete: status.complete,
    profileDetailsComplete: status.profileDetailsComplete,
    isBeta,
    isBetaUser: isBeta,
    hasMasteringAccess: isBeta,
    profileExists: access.profileExists || Boolean(status.profile),
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
    betaUi: isBeta ? await buildBetaUiForEmail(normalized) : null,
  }

  if (!isBeta) {
    return NextResponse.json(payload)
  }

  const response = NextResponse.json(payload)
  if (!resolvedCookieEmail || resolvedCookieEmail !== normalized) {
    await setBetaEmailCookieOnResponse(response, normalized)
  }
  return response
}
