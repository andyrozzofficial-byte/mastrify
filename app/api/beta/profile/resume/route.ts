import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { ACCESS_COOKIE_NAME } from "../../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../../lib/betaUserAccess"
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
  const store = await cookies()
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const cookieEmail = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim()
  const access = await resolveBetaUserAccess(accessCookie, cookieEmail, normalized)
  const status = await getBetaProfileStatus(normalized)

  const isBetaUser = access.isBetaUser || access.profileExists

  const payload = {
    complete: status.complete,
    isBetaUser,
    hasMasteringAccess: isBetaUser,
    profileExists: access.profileExists || Boolean(status.profile),
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
  }

  if (!isBetaUser) {
    return NextResponse.json(payload)
  }

  const response = NextResponse.json(payload)
  if (!cookieEmail || normalizeBetaEmail(cookieEmail) !== normalized) {
    setBetaEmailCookieOnResponse(response, normalized)
  }
  return response
}
